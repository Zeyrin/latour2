import type { RouteRecord } from 'vite-react-ssg'
import App from './App'
import { Confidentialite, LegalNotice, MentionsLegales, Privacy } from './pages/Legal'
import { SuitePage } from './pages/Suite'
import { suiteIds } from './lib/content'
import { suitePaths } from './lib/i18n'

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
]
