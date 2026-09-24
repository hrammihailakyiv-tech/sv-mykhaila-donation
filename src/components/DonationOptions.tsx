import type { DonationOption } from '../data/donationOptions'
import Icon from './Icon'
import Radio from './Radio'

interface Props {
  options: DonationOption[]
  selectedId: string
  onSelect: (id: string) => void
}

export default function DonationOptions({ options, selectedId, onSelect }: Props) {
  return (
    <div
      role="radiogroup"
      aria-label="На що ви хочете пожертвувати?"
      className="grid grid-cols-2 gap-2"
    >
      {options.map((o) => {
        const selected = o.id === selectedId
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onSelect(o.id)}
            className={`relative flex min-h-28 flex-col items-center rounded-xl border px-2 pt-3 pb-2.5 text-center transition ${
              selected
                ? 'border-gold-deep bg-[#fbf3df] shadow-[0_0_18px_-4px_rgba(185,143,78,0.55)]'
                : 'border-night/10 bg-white/55 hover:bg-white/80'
            }`}
          >
            <span className="absolute top-2.5 left-2.5">
              <Radio checked={selected} />
            </span>
            <Icon name={o.icon} className="h-6 w-6 text-gold-deep" />
            <span className="mt-1 text-base leading-tight font-semibold text-night">{o.title}</span>
            <span className="mt-0.5 text-[0.82rem] leading-tight text-night/70">{o.description}</span>
          </button>
        )
      })}
    </div>
  )
}
