import type { RouteRecord } from 'vite-react-ssg'
import App from './App'
import { Confidentialite, MentionsLegales } from './pages/Legal'

export const routes: RouteRecord[] = [
  { path: '/', Component: App },
  { path: '/mentions-legales', Component: MentionsLegales },
  { path: '/confidentialite', Component: Confidentialite },
]
