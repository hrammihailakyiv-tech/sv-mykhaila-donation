import { AMOUNT_PRESETS } from '../data/donationOptions'

export type AmountChoice = number | 'other'

interface Props {
  choice: AmountChoice
  customValue: string
  onChoice: (c: AmountChoice) => void
  onCustomChange: (v: string) => void
}

const fmt = (n: number) => n.toLocaleString('uk-UA').replace(/\s/g, ' ')

export default function AmountSelector({ choice, customValue, onChoice, onCustomChange }: Props) {
  const chip = (active: boolean) =>
    `min-h-11 flex-1 basis-[4rem] whitespace-nowrap rounded-full px-3 text-base font-semibold transition ${
      active ? 'bg-gradient-to-b from-gold to-gold-deep text-night shadow-sm' : 'bg-white/70 text-night hover:bg-white'
    }`
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {AMOUNT_PRESETS.map((a) => (
          <button key={a} type="button" aria-pressed={choice === a} onClick={() => onChoice(a)} className={chip(choice === a)}>
            {fmt(a)} ₴
          </button>
        ))}
        <button type="button" aria-pressed={choice === 'other'} onClick={() => onChoice('other')} className={chip(choice === 'other')}>
          Інша сума
        </button>
      </div>
      {choice === 'other' && (
        <label className="mt-3 flex min-h-12 items-center gap-2 rounded-full border border-gold-deep bg-white/80 px-5">
          <input
            inputMode="numeric"
            pattern="[0-9]*"
            value={customValue}
            onChange={(e) => onCustomChange(e.target.value.replace(/\D/g, '').slice(0, 7))}
            placeholder="Введіть суму"
            aria-label="Сума пожертви"
            className="min-w-0 flex-1 bg-transparent text-xl text-night outline-none placeholder:text-night/40"
          />
          <span className="text-xl text-night/70">₴</span>
        </label>
      )}
    </div>
  )
}
