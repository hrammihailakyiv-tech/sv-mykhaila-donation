import type { PaymentMethod as Method } from '../data/donationOptions'
import Icon from './Icon'
import Radio from './Radio'

const METHODS: { id: Method; title: string; hint: string; icon: string }[] = [
  { id: 'online', title: 'Оплата за посиланням', hint: 'Перехід на сторінку Privat24', icon: 'link' },
  { id: 'card', title: 'Переказ на картку', hint: 'Переказ безпосередньо на картку храму', icon: 'card' },
]

interface Props {
  available: Method[]
  selected: Method
  onSelect: (m: Method) => void
}

export default function PaymentMethod({ available, selected, onSelect }: Props) {
  return (
    <div role="radiogroup" aria-label="Оберіть спосіб пожертви" className="grid gap-2 sm:grid-cols-2">
      {METHODS.filter((m) => available.includes(m.id)).map((m) => {
        const on = m.id === selected
        return (
          <button
            key={m.id}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onSelect(m.id)}
            className={`flex min-h-14 items-center gap-2.5 rounded-xl border px-3 py-2 text-left transition ${
              on
                ? 'border-gold-deep bg-[#fbf3df] shadow-[0_0_18px_-4px_rgba(185,143,78,0.55)]'
                : 'border-night/10 bg-white/55 hover:bg-white/80'
            }`}
          >
            <Icon name={m.icon} className="h-6 w-6 shrink-0 text-gold-deep" />
            <span className="min-w-0 flex-1">
              <span className="block text-base leading-tight font-semibold text-night">{m.title}</span>
              <span className="block text-[0.82rem] leading-tight text-night/70">{m.hint}</span>
            </span>
            <Radio checked={on} />
          </button>
        )
      })}
    </div>
  )
}
