export default function Radio({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border ${checked ? 'border-gold-deep' : 'border-night/30'}`}
    >
      {checked && <span className="h-2.5 w-2.5 rounded-full bg-gold-deep" />}
    </span>
  )
}
