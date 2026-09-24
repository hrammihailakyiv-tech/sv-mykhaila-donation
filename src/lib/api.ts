import { supabase, isSupabaseConfigured } from './supabase'
import { DEMO_OPTIONS, type DonationOption, type PaymentMethod, type PaymentMethodConfig } from '../data/donationOptions'

interface Row {
  id: string
  title: string
  description: string | null
  icon: string | null
  sort_order: number
  donation_payment_methods: {
    method: PaymentMethod
    card_number: string | null
    recipient_name: string | null
    payment_description: string | null
  }[]
}

// Активні варіанти + активні способи оплати (RLS відфільтровує решту).
export async function fetchDonationOptions(): Promise<DonationOption[]> {
  if (!isSupabaseConfigured) return DEMO_OPTIONS
  const { data, error } = await supabase
    .from('donation_options')
    .select(
      'id, title, description, icon, sort_order, donation_payment_methods(method, card_number, recipient_name, payment_description)',
    )
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .returns<Row[]>()
  if (error) throw error
  return (data ?? []).map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description ?? '',
    icon: r.icon ?? '',
    sortOrder: r.sort_order,
    paymentMethods: r.donation_payment_methods.map(
      (m): PaymentMethodConfig => ({
        method: m.method,
        cardNumber: m.card_number ?? undefined,
        recipientName: m.recipient_name ?? undefined,
        paymentDescription: m.payment_description ?? undefined,
      }),
    ),
  }))
}

export type PaymentResult =
  | { type: 'card' }
  | { type: 'demo' }
  | { type: 'redirect'; url: string }
  | { type: 'form'; action: string; method: 'POST'; fields: Record<string, string> }

export interface PaymentRequest {
  donationId: string
  // Сума наразі не вибирається користувачем (Privat24 SendMoney її не приймає).
  // Поле лишається опціональним на майбутнє (напр. динамічна оплата через LiqPay).
  amount?: number
  paymentMethod: PaymentMethod
}

// Фронтенд передає лише id варіанту і спосіб оплати. Жодних URL.
export async function createPayment(req: PaymentRequest): Promise<PaymentResult> {
  if (!isSupabaseConfigured) return req.paymentMethod === 'card' ? { type: 'card' } : { type: 'demo' }
  const { data, error } = await supabase.functions.invoke('create-payment', {
    body: { donation_option_id: req.donationId, payment_method: req.paymentMethod, ...(req.amount ? { amount: req.amount } : {}) },
  })
  if (error || !data || data.error) throw new Error(data?.error ?? 'payment_failed')
  return data as PaymentResult
}

// Редірект лише на URL, який повернув наш сервер, і лише https.
export function followPayment(result: PaymentResult) {
  if (result.type === 'redirect') {
    if (new URL(result.url).protocol === 'https:') window.location.assign(result.url)
    return
  }
  if (result.type === 'form') {
    if (new URL(result.action).protocol !== 'https:') return
    const form = document.createElement('form')
    form.method = 'POST'
    form.action = result.action
    for (const [k, v] of Object.entries(result.fields)) {
      const input = document.createElement('input')
      input.type = 'hidden'
      input.name = k
      input.value = v
      form.appendChild(input)
    }
    document.body.appendChild(form)
    form.submit()
  }
}
