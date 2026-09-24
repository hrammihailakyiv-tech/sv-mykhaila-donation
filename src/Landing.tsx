import { useEffect, useState } from 'react'
import type { DonationOption, PaymentMethod as Method } from './data/donationOptions'
import { createPayment, fetchDonationOptions, followPayment } from './lib/api'
import DonationOptions from './components/DonationOptions'
// Вибір суми тимчасово прибрано з інтерфейсу (Privat24 SendMoney суму не приймає).
// Компонент і стан залишені — можуть знадобитися, коли з'явиться провайдер із динамічною сумою.
// import AmountSelector, { type AmountChoice } from './components/AmountSelector'
import PaymentMethod from './components/PaymentMethod'
import CardDetails from './components/CardDetails'

const h2 = 'mb-2.5 text-center text-[1.2rem] leading-tight font-semibold text-night sm:text-[1.3rem]'

const note = 'py-6 text-center text-base text-night/70'

export default function Landing() {
  const [options, setOptions] = useState<DonationOption[]>([])
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading')
  const [selectedId, setSelectedId] = useState('')
  // const [choice, setChoice] = useState<AmountChoice>(300)
  // const [custom, setCustom] = useState('')
  const [method, setMethod] = useState<Method>('online')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')

  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    fetchDonationOptions()
      .then((data) => {
        if (cancelled) return
        setOptions(data)
        setSelectedId((cur) => (data.some((o) => o.id === cur) ? cur : (data[0]?.id ?? '')))
        setStatus('ready')
      })
      .catch((e) => {
        if (import.meta.env.DEV) console.error(e)
        if (!cancelled) setStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [reloadKey])

  function retry() {
    setStatus('loading')
    setReloadKey((k) => k + 1)
  }

  const option = options.find((o) => o.id === selectedId) ?? options[0]
  const available = option?.paymentMethods.map((m) => m.method) ?? []
  // За замовчуванням — online; якщо в варіанта його немає, перший доступний.
  const activeMethod: Method | undefined = available.includes(method)
    ? method
    : available.includes('online')
      ? 'online'
      : available[0]
  const card = option?.paymentMethods.find((m) => m.method === 'card')

  // Сума наразі не вибирається користувачем: backend визначає спосіб оплати лише за donationId.
  const canSubmit = !!option && !!activeMethod && !submitting

  async function submit() {
    if (!canSubmit || !option || !activeMethod) return
    setMessage('')
    setSubmitting(true)
    try {
      const result = await createPayment({ donationId: option.id, paymentMethod: activeMethod })
      if (result.type === 'card') setMessage('Скопіюйте номер картки та здійсніть переказ у застосунку вашого банку.')
      else if (result.type === 'demo') setMessage('Онлайн-оплата ще не підключена (демо-режим).')
      else followPayment(result)
    } catch (e) {
      if (import.meta.env.DEV) console.error(e)
      setMessage('Не вдалося створити платіж. Спробуйте ще раз.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="relative isolate min-h-svh overflow-hidden bg-night pb-[max(2rem,env(safe-area-inset-bottom))]">
      {/* Розмите тло для широких екранів; на телефоні непомітне */}
      <img src="/temple.jpg" alt="" aria-hidden="true" className="absolute inset-0 -z-10 hidden h-full w-full scale-110 object-cover opacity-25 blur-2xl lg:block" />

      <div className="mx-auto w-full max-w-[38rem]">
        {/* Фото — повний розмір, без затемнення; текст масштабується разом із ним (cqw) */}
        <section className="@container relative">
          <img src="/temple.jpg" alt="" className="block h-auto w-full" />
          <div className="absolute inset-0 p-[5.5cqw] pt-[max(5.5cqw,env(safe-area-inset-top))] [text-shadow:0_1px_10px_rgba(0,0,0,0.75)]">
            <header className="flex items-start gap-[2.5cqw]">
              <svg viewBox="0 0 24 24" className="h-[9cqw] w-[9cqw] shrink-0 text-gold" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
                <path d="M12 1v4M10.5 2.6h3M6 21v-8a6 6 0 0 1 12 0v8M3 21h18M10 21v-5a2 2 0 0 1 4 0v5" />
              </svg>
              <p className="text-[4.1cqw] leading-snug font-medium text-cream">
                Храм святителя Михаїла
                <br />
                першого митрополита Київського
              </p>
            </header>

            <h1 className="mt-[9cqw] max-w-[56cqw] text-[6.8cqw] leading-[1.05] font-medium text-gold">
              Ваше пожертвування — це жива підтримка нашого храму
            </h1>
            <p className="mt-[3.5cqw] max-w-[50cqw] text-[3.6cqw] leading-snug text-cream/90">
              Ваше пожертвування допомагає храму жити, а тим, хто потребує допомоги — отримувати її.
            </p>
          </div>
        </section>

        {/* Панель нижче квітів, без перекриття фото */}
        <div className="mt-3 px-3 sm:px-0">
          <div className="rounded-2xl border border-cream/40 bg-[#f6efe2] p-3 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.6)] sm:p-4">
          {status === 'loading' && <p className={note}>Завантаження…</p>}
          {status === 'error' && (
            <div className={note}>
              <p>Не вдалося завантажити варіанти пожертви.</p>
              <button type="button" onClick={retry} className="mt-3 min-h-11 rounded-full border border-gold-deep px-5 font-semibold text-night">
                Спробувати ще раз
              </button>
            </div>
          )}
          {status === 'ready' && !option && <p className={note}>Наразі немає доступних варіантів пожертви.</p>}
          {status === 'ready' && option && (
            <>
          <h2 className={h2}>На що ви хочете пожертвувати?</h2>
          <DonationOptions options={options} selectedId={option?.id ?? ''} onSelect={setSelectedId} />

          {/* Вибір суми тимчасово прибрано (Privat24 SendMoney суму не приймає). Може знадобитися пізніше.
          <h2 className={`${h2} mt-5`}>Оберіть суму пожертви</h2>
          <AmountSelector choice={choice} customValue={custom} onChoice={setChoice} onCustomChange={setCustom} />
          */}

          <h2 className={`${h2} mt-5`}>Оберіть спосіб пожертви</h2>
          <PaymentMethod available={available} selected={activeMethod ?? 'online'} onSelect={setMethod} />
          {activeMethod === 'card' && card && (
            <div className="mt-3">
              <CardDetails card={card} />
            </div>
          )}

          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit}
            className="mt-5 flex min-h-12 w-full items-center justify-center rounded-full bg-gradient-to-b from-gold to-gold-deep px-4 text-base font-semibold whitespace-nowrap tracking-[0.05em] text-night shadow-[0_6px_18px_-8px_rgba(185,143,78,0.7)] transition active:scale-[0.98] disabled:opacity-50 sm:tracking-[0.12em]"
          >
            {submitting ? 'ЗАЧЕКАЙТЕ…' : 'ПОЖЕРТВУВАТИ →'}
          </button>
          {message && (
            <p role="alert" className="mt-3 text-center text-sm text-night/80">
              {message}
            </p>
          )}
            </>
          )}
        </div>
        </div>
      </div>
    </main>
  )
}
