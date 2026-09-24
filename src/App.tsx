import { lazy, Suspense } from 'react'
import Landing from './Landing'

const Admin = lazy(() => import('./admin/Admin'))

// Проста маршрутизація без бібліотек. Redirect-и на зовнішні URL відсутні:
// оплата виконується через Edge Function create-payment.
export default function App() {
  const path = window.location.pathname.replace(/\/+$/, '') || '/'

  if (path === '/admin') {
    return (
      <Suspense fallback={null}>
        <Admin />
      </Suspense>
    )
  }
  return <Landing />
}
