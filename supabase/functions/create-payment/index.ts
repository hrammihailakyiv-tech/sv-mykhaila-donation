// Supabase Edge Function (Deno): create-payment
//
// Вхід (POST JSON): { donation_option_id, payment_method, amount? }
// amount наразі НЕ використовується для online (Privat24 SendMoney суму не приймає) —
// поле залишене опціональним і зарезервоване під майбутню інтеграцію (LiqPay тощо).
// Жодних URL із браузера не приймається — призначення береться з бази.
//
// Відповіді:
//   { type: "card",     card: {...} }                    — реквізити отримувача
//   { type: "redirect", url }                             — готове посилання Privat24 SendMoney (чи інший провайдер) з бази
//   { type: "form",     action, method:"POST", fields }  — форма LiqPay (лише якщо задані ключі І передано amount)
//   { type: "demo" }                                     — для online немає ні payment_url, ні ключів провайдера
//   { error: "code" }                                    — помилка (без технічних деталей)
//
// Secrets (supabase secrets set ...):
//   SITE_URL                      — https://ваш-домен (CORS)
//   PAYMENT_HOST_ALLOWLIST        — домени, дозволені для payment_url (через кому; за замовчуванням Privat24 + LiqPay)
//   LIQPAY_PUBLIC_KEY, LIQPAY_PRIVATE_KEY — опційно, для майбутньої динамічної оплати із сумою
// SUPABASE_URL і SUPABASE_SERVICE_ROLE_KEY Supabase підставляє автоматично.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const MIN_AMOUNT = 10
const MAX_AMOUNT = 100_000
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const LIQPAY_CHECKOUT = 'https://www.liqpay.ua/api/3/checkout'
const DEFAULT_ALLOWLIST = 'www.privat24.ua,privat24.ua,www.liqpay.ua,liqpay.ua'

const siteUrl = (Deno.env.get('SITE_URL') ?? '').replace(/\/+$/, '')

function corsHeaders(origin: string | null) {
  // Якщо SITE_URL заданий — дозволяємо лише його (та localhost для розробки).
  const allowed = !siteUrl || origin === siteUrl || (origin?.startsWith('http://localhost:') ?? false)
  return {
    'Access-Control-Allow-Origin': allowed && origin ? origin : siteUrl || '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  }
}

function json(body: unknown, status: number, origin: string | null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
  })
}

// ---- Валідація ----

/** Сума (якщо передана): скінченне число, до 2 знаків після коми, у межах MIN..MAX. */
export function validateAmount(v: unknown): number | null {
  if (typeof v !== 'number' || !Number.isFinite(v)) return null
  if (v < MIN_AMOUNT || v > MAX_AMOUNT) return null
  return Math.round(v * 100) / 100
}

/** Лише https, без креденшіалів, домен із allowlist (Privat24 SendMoney за замовчуванням). */
export function isAllowedPaymentUrl(raw: string | null): boolean {
  if (!raw) return false
  const allowlist = (Deno.env.get('PAYMENT_HOST_ALLOWLIST') ?? DEFAULT_ALLOWLIST)
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
  try {
    const u = new URL(raw)
    return u.protocol === 'https:' && !u.username && !u.password && allowlist.includes(u.hostname.toLowerCase())
  } catch {
    return false
  }
}

// ---- LiqPay adapter (майбутнє: коли з'явиться сума і ключі мерчанта) ----
// Документація: https://www.liqpay.ua/documentation/api/aquiring/checkout/
// signature = base64(sha1(private_key + data + private_key)), data = base64(json)

async function liqpaySign(privateKey: string, data: string): Promise<string> {
  const bytes = new TextEncoder().encode(privateKey + data + privateKey)
  const digest = await crypto.subtle.digest('SHA-1', bytes)
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
}

async function buildLiqpayForm(opts: { amount: number; description: string; orderId: string }) {
  const publicKey = Deno.env.get('LIQPAY_PUBLIC_KEY')!
  const privateKey = Deno.env.get('LIQPAY_PRIVATE_KEY')!
  const payload = {
    version: 3,
    public_key: publicKey,
    action: 'pay',
    amount: opts.amount,
    currency: 'UAH',
    description: opts.description,
    order_id: opts.orderId,
    language: 'uk',
    ...(siteUrl ? { result_url: siteUrl } : {}),
  }
  const data = btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(payload))))
  const signature = await liqpaySign(privateKey, data)
  return { type: 'form', action: LIQPAY_CHECKOUT, method: 'POST', fields: { data, signature } }
}

// Безпечна діагностика: лише код/текст помилки БД, без секретів.
function dbError(table: string, err: { code?: string; message?: string }, origin: string | null) {
  console.error('create-payment db error', { table, code: err.code, message: err.message })
  return json({ error: 'server_error', message: `${table}: ${err.code ?? ''} ${err.message ?? ''}`.trim() }, 500, origin)
}

// ---- Handler ----

Deno.serve(async (req) => {
  const origin = req.headers.get('origin')
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(origin) })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405, origin)

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return json({ error: 'bad_request' }, 400, origin)
  }

  const optionId = body.donation_option_id
  const method = body.payment_method
  // amount опціональний: наразі фронтенд його не надсилає (вибір суми прибрано).
  const amountProvided = body.amount !== undefined && body.amount !== null
  const amount = amountProvided ? validateAmount(body.amount) : undefined

  if (typeof optionId !== 'string' || !UUID_RE.test(optionId)) return json({ error: 'invalid_option' }, 400, origin)
  if (method !== 'online' && method !== 'card') return json({ error: 'invalid_method' }, 400, origin)
  if (amountProvided && amount === null) return json({ error: 'invalid_amount' }, 400, origin)

  console.log('create-payment request', { optionId, method, amountProvided })

  // Service role — тільки тут, на сервері.
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  })

  const { data: option, error: optErr } = await db
    .from('donation_options')
    .select('id, title, is_active')
    .eq('id', optionId)
    .maybeSingle()
  if (optErr) return dbError('donation_options', optErr, origin)
  if (!option || !option.is_active) return json({ error: 'option_unavailable' }, 404, origin)

  const { data: pm, error: pmErr } = await db
    .from('donation_payment_methods')
    .select('method, is_active, payment_url, card_number, recipient_name, payment_description')
    .eq('donation_option_id', optionId)
    .eq('method', method)
    .maybeSingle()
  if (pmErr) return dbError('donation_payment_methods', pmErr, origin)
  if (!pm || !pm.is_active) return json({ error: 'method_unavailable' }, 404, origin)
  console.log('create-payment method found', { method, has_payment_url: !!pm.payment_url, has_card: !!pm.card_number })

  if (method === 'card') {
    if (!pm.card_number) return json({ error: 'method_unavailable' }, 404, origin)
    return json(
      {
        type: 'card',
        card: {
          card_number: pm.card_number,
          recipient_name: pm.recipient_name,
          payment_description: pm.payment_description,
        },
      },
      200,
      origin,
    )
  }

  // online: основний сценарій — готове посилання з бази (Privat24 SendMoney).
  // Сума в цю ссылку НЕ підставляється: SendMoney не підтримує параметри URL.
  if (isAllowedPaymentUrl(pm.payment_url)) {
    return json({ type: 'redirect', url: pm.payment_url }, 200, origin)
  }

  // Резерв на майбутнє: якщо колись з'явиться сума і ключі LiqPay — динамічний платіж.
  const hasKeys = !!Deno.env.get('LIQPAY_PUBLIC_KEY') && !!Deno.env.get('LIQPAY_PRIVATE_KEY')
  if (hasKeys && typeof amount === 'number') {
    const description = (pm.payment_description || `Пожертва: ${option.title}`).slice(0, 200)
    return json(await buildLiqpayForm({ amount, description, orderId: crypto.randomUUID() }), 200, origin)
  }

  return json({ type: 'demo' }, 200, origin)
})
