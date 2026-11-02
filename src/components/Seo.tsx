import type { ReactNode } from 'react'
import { Head } from 'vite-react-ssg'
import { SITE_URL } from '../lib/content'
import { paths, type Lang, type PageKey } from '../lib/i18n'

const OG_IMAGE = `${SITE_URL}/images/domaine.webp`

/** `page` : une page connue de `paths`, ou directement ses chemins par langue. */
export function Seo({ lang, page, title, description, image = OG_IMAGE, children }: { lang: Lang; page: PageKey | Record<Lang, string>; title: string; description: string; image?: string; children?: ReactNode }) {
  const pagePaths = typeof page === 'string' ? paths[page] : page
  const url = `${SITE_URL}${pagePaths[lang]}`
  return (
    <Head>
      <html lang={lang} />
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <link rel="alternate" hrefLang="fr" href={`${SITE_URL}${pagePaths.fr}`} />
      <link rel="alternate" hrefLang="en" href={`${SITE_URL}${pagePaths.en}`} />
      <link rel="alternate" hrefLang="x-default" href={`${SITE_URL}${pagePaths.fr}`} />
      <meta property="og:site_name" content="Château Latour Ségur Suites & Spa" />
      <meta property="og:type" content="website" />
      <meta property="og:locale" content={lang === 'fr' ? 'fr_FR' : 'en_GB'} />
      <meta property="og:locale:alternate" content={lang === 'fr' ? 'en_GB' : 'fr_FR'} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={image} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      {children}
    </Head>
  )
}
