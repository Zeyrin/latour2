import type { RouteRecord } from 'vite-react-ssg'
import App from './App'
import { Confidentialite, LegalNotice, MentionsLegales, Privacy } from './pages/Legal'

export const routes: RouteRecord[] = [
  { path: '/', Component: App },
  { path: '/en', element: <App lang="en" /> },
  { path: '/mentions-legales', Component: MentionsLegales },
  { path: '/confidentialite', Component: Confidentialite },
  { path: '/en/legal-notice', Component: LegalNotice },
  { path: '/en/privacy', Component: Privacy },
]
