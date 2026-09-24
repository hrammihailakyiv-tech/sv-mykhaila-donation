export type PaymentMethod = 'online' | 'card'

// Публічні налаштування способу оплати (payment_url на клієнт не потрапляє).
export interface PaymentMethodConfig {
  method: PaymentMethod
  cardNumber?: string
  recipientName?: string
  paymentDescription?: string
}

export interface DonationOption {
  id: string
  title: string
  description: string
  icon: string
  sortOrder: number
  paymentMethods: PaymentMethodConfig[]
}

export const AMOUNT_PRESETS = [100, 300, 500, 1000]
export const MIN_AMOUNT = 10
export const MAX_AMOUNT = 100000

// Демо-дані: використовуються ЛИШЕ коли Supabase не налаштований (VITE_SUPABASE_URL порожній).
const demoMethods = (n: number): PaymentMethodConfig[] => [
  { method: 'online' },
  {
    method: 'card',
    cardNumber: `0000 0000 0000 000${n}`,
    recipientName: 'Храм святителя Михаїла',
    paymentDescription: 'Пожертва',
  },
]

export const DEMO_OPTIONS: DonationOption[] = [
  { id: 'demo-1', title: 'На потреби храму', description: 'На утримання та розвиток храму', icon: 'church', sortOrder: 1, paymentMethods: demoMethods(1) },
  { id: 'demo-2', title: 'На благодійні обіди', description: 'Щоб ми могли годувати людей, які потребують допомоги', icon: 'bowl', sortOrder: 2, paymentMethods: demoMethods(2) },
  { id: 'demo-3', title: 'На допомогу нужденним', description: 'Продукти, необхідні речі, підтримка', icon: 'people', sortOrder: 3, paymentMethods: demoMethods(3) },
  { id: 'demo-4', title: 'На свічки і молитви', description: 'На богослужіння, свічки та духовні потреби', icon: 'candle', sortOrder: 4, paymentMethods: demoMethods(4) },
]
