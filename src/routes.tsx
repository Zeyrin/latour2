import type { RouteRecord } from 'vite-react-ssg'
import App from './App'
import { Confidentialite, LegalNotice, MentionsLegales, Privacy } from './pages/Legal'
import { SuitePage } from './pages/Suite'
import { BookingCancelledEn, BookingCancelledFr, BookingConfirmedEn, BookingConfirmedFr } from './pages/BookingReturn'
import { NotFound } from './pages/NotFound'
import { suiteIds } from './lib/content'
import { paths, suitePaths } from './lib/i18n'

export const routes: RouteRecord[] = [
  { path: '/', Component: App },
  { path: '/en', element: <App lang="en" /> },
  ...suiteIds.flatMap((id) => [
    { path: suitePaths(id).fr, element: <SuitePage id={id} /> },
    { path: suitePaths(id).en, element: <SuitePage id={id} lang="en" /> },
  ]),
  { path: '/mentions-legales', Component: MentionsLegales },
  { path: '/confidentialite', Component: Confidentialite },
  { path: '/en/legal-notice', Component: LegalNotice },
  { path: '/en/privacy', Component: Privacy },
  { path: paths.bookingConfirmed.fr, Component: BookingConfirmedFr },
  { path: paths.bookingConfirmed.en, Component: BookingConfirmedEn },
  { path: paths.bookingCancelled.fr, Component: BookingCancelledFr },
  { path: paths.bookingCancelled.en, Component: BookingCancelledEn },
  // Pré-rendue en 404.html (servie par Vercel avec le statut 404) ; « * » couvre la navigation côté navigateur.
  { path: '/404', Component: NotFound },
  { path: '*', Component: NotFound },
]
