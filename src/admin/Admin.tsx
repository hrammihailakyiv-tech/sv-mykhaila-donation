import { useCallback, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import OptionEditor from './OptionEditor'
import type { AdminOption, AuditRow } from './types'

const btn = 'min-h-10 rounded-full border border-gold-deep px-4 text-sm font-semibold text-night transition hover:bg-gold/30 disabled:opacity-40'
const btnPrimary = 'min-h-10 rounded-full bg-gradient-to-b from-gold to-gold-deep px-5 text-sm font-semibold text-night disabled:opacity-40'

function Shell({ children, onSignOut }: { children: React.ReactNode; onSignOut?: () => void }) {
  return (
    <main className="min-h-svh bg-[#f6efe2] text-night">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
        <header className="mb-6 flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold">Адмін-панель</h1>
          {onSignOut && (
            <button type="button" className={btn} onClick={onSignOut}>
              Вийти
            </button>
          )}
        </header>
        {children}
      </div>
    </main>
  )
}

export default function Admin() {
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(false)
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)

  useEffect(() => {
    if (!isSupabaseConfigured) return
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setReady(true)
    })
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  const userId = session?.user.id
  useEffect(() => {
    if (!userId) return
    let cancelled = false
    void supabase.rpc('is_admin').then(({ data }) => {
      if (!cancelled) setIsAdmin(data === true)
    })
    return () => {
      cancelled = true
    }
  }, [userId])

  if (!isSupabaseConfigured) {
    return (
      <Shell>
        <p>Supabase не налаштований. Заповніть VITE_SUPABASE_URL і VITE_SUPABASE_ANON_KEY (див. README).</p>
      </Shell>
    )
  }
  if (!ready) return <Shell>Завантаження…</Shell>
  if (!session) return <Login />

  const signOut = () => void supabase.auth.signOut().then(() => setIsAdmin(null))
  if (isAdmin === null) return <Shell onSignOut={signOut}>Перевірка доступу…</Shell>
  if (!isAdmin) {
    return (
      <Shell onSignOut={signOut}>
        <p>Цей акаунт не має доступу до адмін-панелі. Зверніться до власника сайту.</p>
      </Shell>
    )
  }
  return (
    <Shell onSignOut={signOut}>
      <Panel />
    </Shell>
  )
}

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError('Невірна пошта або пароль.')
    setBusy(false)
  }

  const input = 'min-h-11 w-full rounded-lg border border-night/20 bg-white px-3 text-base'
  return (
    <Shell>
      <form onSubmit={submit} className="mx-auto max-w-sm space-y-3 rounded-2xl bg-white/70 p-5">
        <h2 className="text-xl font-semibold">Вхід</h2>
        <input className={input} type="email" autoComplete="username" placeholder="Електронна пошта" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className={input} type="password" autoComplete="current-password" placeholder="Пароль" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {error && <p role="alert" className="text-sm text-red-800">{error}</p>}
        <button className={`${btnPrimary} w-full`} disabled={busy}>
          Увійти
        </button>
      </form>
    </Shell>
  )
}

const OPTION_SELECT =
  '*, donation_payment_methods(id, method, is_active, payment_url, card_number, recipient_name, payment_description)'

function Panel() {
  const [options, setOptions] = useState<AdminOption[]>([])
  const [audit, setAudit] = useState<AuditRow[]>([])
  const [editing, setEditing] = useState<AdminOption | 'new' | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const [version, setVersion] = useState(0)
  const load = useCallback(() => setVersion((v) => v + 1), [])

  useEffect(() => {
    let cancelled = false
    Promise.all([
      supabase.from('donation_options').select(OPTION_SELECT).order('sort_order').returns<AdminOption[]>(),
      supabase.from('donation_audit_log').select('*').order('changed_at', { ascending: false }).limit(15).returns<AuditRow[]>(),
    ]).then(([o, a]) => {
      if (cancelled) return
      if (o.error) setError('Не вдалося завантажити дані.')
      else {
        setOptions(o.data ?? [])
        setError('')
      }
      setAudit(a.data ?? [])
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [version])

  async function run(op: PromiseLike<{ error: unknown }>) {
    const { error } = await op
    if (error) setError('Не вдалося зберегти зміни.')
    load()
  }

  const toggle = (o: AdminOption) => run(supabase.from('donation_options').update({ is_active: !o.is_active }).eq('id', o.id))

  async function move(index: number, dir: -1 | 1) {
    const list = [...options]
    const j = index + dir
    if (j < 0 || j >= list.length) return
    ;[list[index], list[j]] = [list[j], list[index]]
    // Нормалізуємо порядок: 1..N
    const ops = list.map((o, i) => (o.sort_order === i + 1 ? null : supabase.from('donation_options').update({ sort_order: i + 1 }).eq('id', o.id)))
    const results = await Promise.all(ops.filter((x) => x !== null))
    if (results.some((r) => r.error)) setError('Не вдалося змінити порядок.')
    load()
  }

  function remove(o: AdminOption) {
    if (!window.confirm(`Видалити «${o.title}» назавжди? Можна лише вимкнути варіант.`)) return
    void run(supabase.from('donation_options').delete().eq('id', o.id))
  }

  if (editing) {
    return (
      <OptionEditor
        option={editing === 'new' ? null : editing}
        nextOrder={options.reduce((m, o) => Math.max(m, o.sort_order), 0) + 1}
        onCancel={() => setEditing(null)}
        onSaved={() => {
          setEditing(null)
          load()
        }}
      />
    )
  }

  return (
    <>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Варіанти пожертви</h2>
        <button type="button" className={btnPrimary} onClick={() => setEditing('new')}>
          + Додати
        </button>
      </div>
      {error && <p role="alert" className="mb-3 text-sm text-red-800">{error}</p>}
      {loading && <p>Завантаження…</p>}
      <ul className="space-y-2">
        {options.map((o, i) => (
          <li key={o.id} className={`rounded-xl border border-night/10 bg-white/70 p-3 ${o.is_active ? '' : 'opacity-60'}`}>
            <div className="flex flex-wrap items-center gap-2">
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{o.title}</p>
                <p className="text-sm text-night/70">
                  {o.is_active ? 'Активний' : 'Неактивний'} · Порядок {o.sort_order} ·{' '}
                  {o.donation_payment_methods.filter((m) => m.is_active).map((m) => (m.method === 'online' ? 'посилання' : 'картка')).join(', ') || 'без способів оплати'}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" className={btn} onClick={() => void move(i, -1)} disabled={i === 0} aria-label="Вище">↑</button>
                <button type="button" className={btn} onClick={() => void move(i, 1)} disabled={i === options.length - 1} aria-label="Нижче">↓</button>
                <button type="button" className={btn} onClick={() => void toggle(o)}>{o.is_active ? 'Вимкнути' : 'Увімкнути'}</button>
                <button type="button" className={btn} onClick={() => setEditing(o)}>Редагувати</button>
                <button type="button" className={btn} onClick={() => remove(o)}>Видалити</button>
              </div>
            </div>
          </li>
        ))}
        {!loading && options.length === 0 && <li className="text-night/70">Варіантів ще немає.</li>}
      </ul>

      <h2 className="mt-8 mb-2 text-xl font-semibold">Останні зміни</h2>
      <ul className="space-y-1 text-sm text-night/80">
        {audit.map((a) => (
          <li key={a.id}>
            {new Date(a.changed_at).toLocaleString('uk-UA')} · {a.entity_type === 'donation_options' ? 'варіант' : 'спосіб оплати'} · {a.action} ·{' '}
            {Object.keys(a.changes).join(', ') || '—'}
          </li>
        ))}
        {audit.length === 0 && <li>Змін ще не було.</li>}
      </ul>
    </>
  )
}
