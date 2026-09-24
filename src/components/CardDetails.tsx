import { useState } from 'react'
import type { PaymentMethodConfig } from '../data/donationOptions'
import Icon from './Icon'

// Реквізити картки ОТРИМУВАЧА (не картка користувача).
export default function CardDetails({ card }: { card: PaymentMethodConfig }) {
  const [copied, setCopied] = useState(false)
  const number = card.cardNumber ?? ''

  async function copy() {
    const raw = number.replace(/\s/g, '')
    try {
      await navigator.clipboard.writeText(raw)
    } catch {
      const t = document.createElement('textarea')
      t.value = raw
      document.body.appendChild(t)
      t.select()
      document.execCommand('copy')
      t.remove()
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <section className="rounded-xl border border-gold-deep/40 bg-white/60 p-4" aria-label="Реквізити для пожертви">
      <h3 className="text-xl font-semibold text-night">Реквізити для пожертви</h3>
      <p className="mt-2 flex items-center gap-2 text-[0.95rem] text-night/70">
        <Icon name="card" className="h-5 w-5 text-gold-deep" /> Номер картки отримувача
      </p>
      <div className="mt-1.5 flex flex-wrap items-center gap-3">
        <span className="text-2xl font-semibold tracking-wider text-night tabular-nums">{number}</span>
        <button
          type="button"
          onClick={copy}
          className="min-h-11 rounded-full border border-gold-deep px-4 text-base font-semibold text-night transition hover:bg-gold/30"
        >
          {copied ? 'Номер скопійовано ✓' : 'Скопіювати номер'}
        </button>
      </div>
      <span role="status" className="sr-only">
        {copied ? 'Номер скопійовано' : ''}
      </span>
      {card.recipientName && (
        <p className="mt-3 text-base text-night/70">
          Отримувач: <b className="font-semibold text-night">{card.recipientName}</b>
        </p>
      )}
      {card.paymentDescription && (
        <p className="text-base text-night/70">
          Призначення платежу: <b className="font-semibold text-night">{card.paymentDescription}</b>
        </p>
      )}
      <p className="mt-3 text-[0.95rem] leading-snug text-night/70">
        Скопіюйте номер картки та здійсніть переказ у застосунку вашого банку.
      </p>
    </section>
  )
}
