import type { ReactNode } from 'react'
import { Head } from 'vite-react-ssg'
import { SITE_URL } from '../lib/content'

const OG_IMAGE = `${SITE_URL}/images/domaine.webp`

export function Seo({ title, description, path, children }: { title: string; description: string; path: string; children?: ReactNode }) {
  const url = `${SITE_URL}${path}`
  return (
    <Head>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <meta property="og:site_name" content="Château Latour Ségur" />
      <meta property="og:type" content="website" />
      <meta property="og:locale" content="fr_FR" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={OG_IMAGE} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={OG_IMAGE} />
      {children}
    </Head>
  )
}
