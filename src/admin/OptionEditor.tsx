import { useState } from 'react'
import { supabase } from '../lib/supabase'
import type { AdminOption } from './types'

const ICONS = ['church', 'bowl', 'people', 'candle', 'heart']
const input = 'min-h-11 w-full rounded-lg border border-night/20 bg-white px-3 text-base'
const label = 'block text-sm font-semibold text-night/80'
const btn = 'min-h-10 rounded-full border border-gold-deep px-4 text-sm font-semibold text-night hover:bg-gold/30 disabled:opacity-40'

interface MethodForm {
  enabled: boolean
  url: string
  card: string
  recipient: string
  description: string
}

const emptyMethod: MethodForm = { enabled: false, url: '', card: '', recipient: '', description: '' }

function initial(option: AdminOption | null, method: 'online' | 'card'): MethodForm {
  const m = option?.donation_payment_methods.find((x) => x.method === method)
  if (!m) return emptyMethod
  return {
    enabled: m.is_active,
    url: m.payment_url ?? '',
    card: m.card_number ?? '',
    recipient: m.recipient_name ?? '',
    description: m.payment_description ?? '',
  }
}

const nul = (s: string) => (s.trim() === '' ? null : s.trim())

interface Props {
  option: AdminOption | null
  nextOrder: number
  onCancel: () => void
  onSaved: () => void
}

export default function OptionEditor({ option, nextOrder, onCancel, onSaved }: Props) {
  const [title, setTitle] = useState(option?.title ?? '')
  const [description, setDescription] = useState(option?.description ?? '')
  const [icon, setIcon] = useState(option?.icon ?? 'heart')
  const [active, setActive] = useState(option?.is_active ?? true)
  const [online, setOnline] = useState(initial(option, 'online'))
  const [card, setCard] = useState(initial(option, 'card'))
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  function validate(): string {
    if (!title.trim()) return 'Вкажіть назву.'
    if (online.url.trim() && !/^https:\/\/[^\s]+$/i.test(online.url.trim())) return 'Посилання має починатися з https://'
    if (card.enabled && !/^[0-9 ]{12,23}$/.test(card.card.trim())) return 'Номер картки: лише цифри (12–19).'
    return ''
  }

  async function save() {
    const problem = validate()
    if (problem) return setError(problem)
    setBusy(true)
    setError('')
    try {
      const fields = { title: title.trim(), description: nul(description), icon, is_active: active }
      let id = option?.id
      if (id) {
        const { error } = await supabase.from('donation_options').update(fields).eq('id', id)
        if (error) throw error
      } else {
        const { data, error } = await supabase.from('donation_options').insert({ ...fields, sort_order: nextOrder }).select('id').single()
        if (error) throw error
        id = data.id as string
      }

      const rows = [
        { method: 'online', f: online, payload: { payment_url: nul(online.url), card_number: null, recipient_name: null, payment_description: nul(online.description) } },
        { method: 'card', f: card, payload: { payment_url: null, card_number: nul(card.card), recipient_name: nul(card.recipient), payment_description: nul(card.description) } },
      ] as const
      for (const r of rows) {
        const exists = option?.donation_payment_methods.some((m) => m.method === r.method)
        if (!exists && !r.f.enabled) continue
        const { error } = await supabase
          .from('donation_payment_methods')
          .upsert({ donation_option_id: id, method: r.method, is_active: r.f.enabled, ...r.payload }, { onConflict: 'donation_option_id,method' })
        if (error) throw error
      }
      onSaved()
    } catch {
      setError('Не вдалося зберегти. Перевірте дані та спробуйте ще раз.')
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">{option ? 'Редагувати варіант' : 'Новий варіант'}</h2>

      <div className="space-y-3 rounded-2xl bg-white/70 p-4">
        <div>
          <label className={label} htmlFor="t">Назва</label>
          <input id="t" className={input} value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <label className={label} htmlFor="d">Опис</label>
          <input id="d" className={input} value={description} maxLength={300} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div>
          <label className={label} htmlFor="i">Іконка</label>
          <select id="i" className={input} value={icon} onChange={(e) => setIcon(e.target.value)}>
            {ICONS.map((i) => <option key={i} value={i}>{i}</option>)}
          </select>
        </div>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-5 w-5" /> Активний (показувати на сайті)
        </label>
      </div>

      <div className="space-y-3 rounded-2xl bg-white/70 p-4">
        <h3 className="font-semibold">Способи оплати</h3>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={online.enabled} onChange={(e) => setOnline({ ...online, enabled: e.target.checked })} className="h-5 w-5" /> Оплата за посиланням
        </label>
        {online.enabled && (
          <div className="space-y-2 pl-7">
            <div>
              <label className={label} htmlFor="u">Посилання Privat24 SendMoney (https)</label>
              <input id="u" className={input} inputMode="url" value={online.url} onChange={(e) => setOnline({ ...online, url: e.target.value })} placeholder="https://www.privat24.ua/send/xxxxx" />
              <p className="mt-1 text-xs text-night/60">
                Готове посилання зі сервісу SendMoney в Приват24 («Отримати гроші»). Сума в цю ссылку не передається —
                Privat24 SendMoney її не приймає.
              </p>
            </div>
            <div>
              <label className={label} htmlFor="od">Призначення платежу</label>
              <input id="od" className={input} value={online.description} onChange={(e) => setOnline({ ...online, description: e.target.value })} />
            </div>
          </div>
        )}

        <label className="flex items-center gap-2">
          <input type="checkbox" checked={card.enabled} onChange={(e) => setCard({ ...card, enabled: e.target.checked })} className="h-5 w-5" /> Переказ на картку
        </label>
        {card.enabled && (
          <div className="space-y-2 pl-7">
            <div>
              <label className={label} htmlFor="cn">Номер картки отримувача</label>
              <input id="cn" className={input} inputMode="numeric" value={card.card} onChange={(e) => setCard({ ...card, card: e.target.value })} />
            </div>
            <div>
              <label className={label} htmlFor="cr">Отримувач</label>
              <input id="cr" className={input} value={card.recipient} onChange={(e) => setCard({ ...card, recipient: e.target.value })} />
            </div>
            <div>
              <label className={label} htmlFor="cd">Призначення платежу</label>
              <input id="cd" className={input} value={card.description} onChange={(e) => setCard({ ...card, description: e.target.value })} />
            </div>
          </div>
        )}
      </div>

      {error && <p role="alert" className="text-sm text-red-800">{error}</p>}
      <div className="flex gap-2">
        <button type="button" className="min-h-10 rounded-full bg-gradient-to-b from-gold to-gold-deep px-6 text-sm font-semibold text-night disabled:opacity-40" onClick={() => void save()} disabled={busy}>
          Зберегти
        </button>
        <button type="button" className={btn} onClick={onCancel} disabled={busy}>Скасувати</button>
      </div>
    </div>
  )
}
