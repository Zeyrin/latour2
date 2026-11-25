import { useEffect, useState, type ReactNode } from 'react'
import { ArrowLeft, ArrowRight, ArrowUpRight, Globe } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Brand } from '../components/Brand'
import { BookingForm } from '../components/BookingForm'
import { Modal } from '../components/Modal'
import { Picture } from '../components/Picture'
import { Seo } from '../components/Seo'
import { SITE_URL, contact, spaUrl, suiteDetails, suitePhotos, suites, type SuiteId } from '../lib/content'
import { guideById, guidePaths, guides, guidesIndexPaths, readingMinutes, type Guide, type GuideBlock, type GuideId } from '../lib/guides'
import { LangContext, locales, paths, suitePaths, type Lang } from '../lib/i18n'
import { MIN_NIGHTS, RATES, formatEuros } from '../lib/pricing'
import { ui } from '../lib/ui'
import { giftPaths } from '../lib/gifts'
import '../guides.css'

const text = {
  fr: {
    eyebrow: 'Guides',
    indexTitle: ['Guides de', 'Saint-Émilion'],
    indexLead: 'Nos conseils pour préparer votre séjour autour de Saint-Émilion : quoi voir, où dormir, comment profiter du vignoble à votre rythme. Écrits au château, par ceux qui y vivent.',
    indexSeoTitle: 'Guides de Saint-Émilion | Latour Ségur',
    indexSeoDescription: 'Itinéraires, week-ends à deux, conseils pour dormir au château : nos guides pour préparer un séjour autour de Saint-Émilion.',
    allGuides: 'Tous les guides',
    home: 'Accueil',
    minutes: (n: number) => `${n} min de lecture`,
    updated: 'Mis à jour le',
    bookTitle: 'Séjourner au château',
    bookText: 'Cinq suites avec cheminée à Lussac, à dix minutes de Saint-Émilion, et le Spa TerreHappy® sur le domaine.',
    from: 'Suites dès',
    perNight: 'la nuit',
    book: 'Réserver en direct',
    bookShort: 'Réserver',
    seeSuite: 'Voir la suite',
    bookSuite: 'Réserver',
    night: (n: number) => n > 1 ? `${n} nuits min.` : 'dès 1 nuit',
    related: 'À lire aussi',
    readGuide: 'Lire le guide',
  },
  en: {
    eyebrow: 'Guides',
    indexTitle: ['Saint-Émilion', 'guides'],
    indexLead: 'Our tips for planning a stay around Saint-Émilion: what to see, where to stay and how to enjoy the vineyards at your own pace. Written at the château, by the people who live here.',
    indexSeoTitle: 'Saint-Émilion travel guides | Latour Ségur',
    indexSeoDescription: 'Itineraries, weekends for two and tips on staying in a château: our guides to planning a stay around Saint-Émilion.',
    allGuides: 'All guides',
    home: 'Home',
    minutes: (n: number) => `${n} min read`,
    updated: 'Updated',
    bookTitle: 'Stay at the château',
    bookText: 'Five suites with fireplaces in Lussac, ten minutes from Saint-Émilion, with Spa TerreHappy® on the estate.',
    from: 'Suites from',
    perNight: 'a night',
    book: 'Book direct',
    bookShort: 'Book',
    seeSuite: 'See the suite',
    bookSuite: 'Book',
    night: (n: number) => n > 1 ? `${n}-night min.` : 'from 1 night',
    related: 'Read next',
    readGuide: 'Read the guide',
  },
}

const lowestNight = Math.min(...Object.values(RATES).map((rate) => rate.night))
const formatDate = (date: string, lang: Lang) => new Date(`${date}T12:00:00Z`).toLocaleDateString(locales[lang], { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })

/** Transforme les liens « [texte](adresse) » d'un paragraphe en vrais liens. */
function richText(source: string, lang: Lang): ReactNode[] {
  const parts: ReactNode[] = []
  const pattern = /\[([^\]]+)\]\(([^)]+)\)/g
  let last = 0
  for (const match of source.matchAll(pattern)) {
    const [whole, label, target] = match
    parts.push(source.slice(last, match.index))
    const key = `${match.index}-${target}`
    if (target === 'spa' || target.startsWith('http')) {
      const href = target === 'spa' ? spaUrl('guide', lang) : target
      parts.push(<a key={key} href={href} target="_blank" rel="noopener" aria-label={`${label} ${ui[lang].newWindow}`}>{label}</a>)
    } else {
      const to = target === 'cadeau' ? giftPaths[lang] : target.startsWith('guide:') ? guidePaths(guideById(target.slice(6) as GuideId))[lang] : target
      parts.push(<Link key={key} to={to}>{label}</Link>)
    }
    last = match.index + whole.length
  }
  parts.push(source.slice(last))
  return parts
}

function SuiteCard({ id, note, lang, onBook }: { id: SuiteId; note: string; lang: Lang; onBook: (id: SuiteId) => void }) {
  const t = text[lang]
  const label = suites[lang].find((suite) => suite.id === id)!.label
  const detail = suiteDetails[lang][id]
  const rate = RATES[id]
  const cover = suitePhotos[id][0]
  return (
    <aside className="guide-suite" aria-label={label}>
      <Link to={suitePaths(id)[lang]} className="guide-suite-image" tabIndex={-1} aria-hidden="true">{cover && <img src={cover} alt="" loading="lazy" decoding="async" />}</Link>
      <div className="guide-suite-copy">
        <h3><Link to={suitePaths(id)[lang]}>{label}</Link></h3>
        <p className="guide-suite-facts">{detail.surface} · {detail.guests} · {t.night(rate.minNights ?? MIN_NIGHTS)} · {ui[lang].suitePage.fromPerNight(formatEuros(rate.night, locales[lang]))}</p>
        <p>{note}</p>
        <div className="guide-suite-actions">
          <button className="button button-burgundy" onClick={() => onBook(id)}>{t.bookSuite} <ArrowRight size={16} /></button>
          <Link className="text-link" to={suitePaths(id)[lang]}>{t.seeSuite} <ArrowUpRight size={15} strokeWidth={1.25} /></Link>
        </div>
      </div>
    </aside>
  )
}

function GuideCard({ guide, lang, headingLevel = 'h2' }: { guide: Guide; lang: Lang; headingLevel?: 'h2' | 'h3' }) {
  const g = guide.text[lang]
  const Heading = headingLevel
  return (
    <li className="guide-card">
      <Link to={guidePaths(guide)[lang]}>
        <span className="guide-card-image"><Picture name={guide.image} alt="" sizes="(max-width: 700px) 100vw, 33vw" /></span>
        <span className="eyebrow">{g.category} · {text[lang].minutes(readingMinutes(g))}</span>
        <Heading>{g.title}</Heading>
        <span className="guide-card-description">{g.description}</span>
        <span className="text-link">{text[lang].readGuide} <ArrowUpRight size={15} strokeWidth={1.25} /></span>
      </Link>
    </li>
  )
}

/** En-tête et pied de page communs aux guides (mêmes que les fiches des suites). */
export function GuideFrame({ lang, other, back, onBook, children }: { lang: Lang; other: string; back: { to: string; label: string }; onBook: () => void; children: ReactNode }) {
  const t = ui[lang]
  const otherLang: Lang = lang === 'fr' ? 'en' : 'fr'
  return (
    <>
      <header className="suite-header">
        <Link to={paths.home[lang]} className="suite-header-brand" aria-label={t.homeLabel}><Brand /></Link>
        <Link to={back.to} className="suite-back"><ArrowLeft size={15} strokeWidth={1.25} />{back.label}</Link>
        <div className="suite-header-actions">
          <Link to={other} className="lang-switch" hrefLang={otherLang} lang={otherLang} aria-label={t.switchLang}><Globe size={14} strokeWidth={1.25} />{t.switchLabel}</Link>
          <button className="button header-cta" onClick={onBook}>{text[lang].book} <ArrowUpRight size={15} strokeWidth={1.5} /></button>
        </div>
      </header>
      {children}
      <aside className="suite-mobile-bar" aria-label={text[lang].bookShort}><span><strong>Château Latour Ségur</strong>{text[lang].from} {formatEuros(lowestNight, locales[lang])}</span><button className="button button-burgundy" onClick={onBook}>{text[lang].bookShort}</button></aside>
      <footer className="suite-footer">
        <div className="page-width">
          <Link to={paths.home[lang]} aria-label={t.homeLabel}><Brand /></Link>
          <address>{contact.address}, {contact.locality}<br /><a href={`tel:${contact.phoneLink}`}>{contact.phone}</a> · <a href={`mailto:${contact.email}`}>{contact.email}</a></address>
          <div className="suite-footer-links"><Link to={paths.home[lang]}>{t.homeKeywordLink}</Link><Link to={guidesIndexPaths[lang]}>{text[lang].allGuides}</Link><Link to={giftPaths[lang]}>{t.footerGift}</Link><Link to={paths.legal[lang]}>{t.legal}</Link></div>
        </div>
      </footer>
    </>
  )
}

function useBooking() {
  const [suite, setSuite] = useState<SuiteId | null>(null)
  return { suite, open: (id: SuiteId) => setSuite(id), close: () => setSuite(null) }
}

export function BookingModal({ suite, lang, onClose }: { suite: SuiteId | null; lang: Lang; onClose: () => void }) {
  if (!suite) return null
  return <Modal title={ui[lang].bookingModal} onClose={onClose} className="content-modal booking-modal"><BookingForm initialUniverse="suites" initialSuite={suite} /></Modal>
}

function guideJsonLd(guide: Guide, lang: Lang) {
  const g = guide.text[lang]
  const url = `${SITE_URL}${guidePaths(guide)[lang]}`
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article',
        '@id': `${url}#article`,
        headline: g.title,
        description: g.description,
        image: [`${SITE_URL}/images/${guide.image}.webp`],
        datePublished: guide.published,
        dateModified: guide.updated,
        inLanguage: lang,
        mainEntityOfPage: url,
        author: { '@type': 'Organization', name: 'Château Latour Ségur Suites & Spa', url: `${SITE_URL}${paths.home[lang]}` },
        publisher: { '@id': `${SITE_URL}/#etablissement` },
        about: { '@id': `${SITE_URL}/#etablissement` },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: ui[lang].homeKeywordLink, item: `${SITE_URL}${paths.home[lang]}` },
          { '@type': 'ListItem', position: 2, name: text[lang].eyebrow, item: `${SITE_URL}${guidesIndexPaths[lang]}` },
          { '@type': 'ListItem', position: 3, name: g.title, item: url },
        ],
      },
    ],
  }
}

/** Un guide : photo, texte, cartes des suites conseillées et réservation directe. */
export function GuidePage({ id, lang = 'fr' }: { id: GuideId; lang?: Lang }) {
  const guide = guideById(id)
  const g = guide.text[lang]
  const t = text[lang]
  const other: Lang = lang === 'fr' ? 'en' : 'fr'
  const booking = useBooking()

  useEffect(() => { window.scrollTo({ top: 0, left: 0, behavior: 'instant' }) }, [id])

  const renderBlock = (block: GuideBlock, index: number) => {
    if (typeof block === 'string') return <p key={index}>{richText(block, lang)}</p>
    if ('h2' in block) return <h2 key={index}>{block.h2}</h2>
    if ('list' in block) return <ul key={index}>{block.list.map((item) => <li key={item}>{richText(item, lang)}</li>)}</ul>
    return <SuiteCard key={index} id={block.suite} note={block.text} lang={lang} onBook={booking.open} />
  }

  return (
    <LangContext.Provider value={lang}>
      <div className="suite-page guide-page">
        <Seo lang={lang} page={guidePaths(guide)} title={`${g.seoTitle} | Latour Ségur`} description={g.description} image={`${SITE_URL}/images/${guide.image}.webp`}><script type="application/ld+json">{JSON.stringify(guideJsonLd(guide, lang))}</script></Seo>
        <GuideFrame lang={lang} other={guidePaths(guide)[other]} back={{ to: guidesIndexPaths[lang], label: t.allGuides }} onBook={() => booking.open(guide.suite)}>
          <main>
            <article>
              <header className="guide-hero page-width">
                <nav className="suite-breadcrumb" aria-label={ui[lang].breadcrumbLabel}><ol><li><Link to={paths.home[lang]}>{t.home}</Link></li><li><Link to={guidesIndexPaths[lang]}>{t.eyebrow}</Link></li><li aria-current="page">{g.category}</li></ol></nav>
                <p className="eyebrow">{g.category} · {t.minutes(readingMinutes(g))}</p>
                <h1>{g.title}</h1>
                <p className="guide-lead">{g.lead}</p>
              </header>
              <figure className="guide-cover"><Picture name={guide.image} alt={g.imageAlt} priority sizes="100vw" /></figure>
              <div className="guide-body page-width">
                <div className="guide-text">
                  {g.body.map(renderBlock)}
                  <p className="guide-date">{t.updated} <time dateTime={guide.updated}>{formatDate(guide.updated, lang)}</time></p>
                </div>
                <aside className="suite-book guide-book" aria-label={t.bookTitle}>
                  <p className="eyebrow">{t.bookTitle}</p>
                  <p className="guide-book-text">{t.bookText}</p>
                  <p className="suite-book-price"><span>{t.from}</span><strong>{formatEuros(lowestNight, locales[lang])}</strong><span>{t.perNight}</span></p>
                  <button className="button button-burgundy" onClick={() => booking.open(guide.suite)}>{t.book} <ArrowRight size={17} /></button>
                  <p className="ancv"><img src="/images/ancv.svg" alt="ANCV" width="45" height="25" loading="lazy" />{ui[lang].ancv}</p>
                </aside>
              </div>
            </article>
            <nav className="guide-related" aria-labelledby="guide-related-heading">
              <div className="page-width">
                <h2 id="guide-related-heading">{t.related}</h2>
                <ul className="guide-grid">{guide.related.map((relatedId) => <GuideCard key={relatedId} guide={guideById(relatedId)} lang={lang} headingLevel="h3" />)}</ul>
              </div>
            </nav>
          </main>
        </GuideFrame>
        <BookingModal suite={booking.suite} lang={lang} onClose={booking.close} />
      </div>
    </LangContext.Provider>
  )
}

/** La liste des guides (/guides). */
export function GuidesIndex({ lang = 'fr' }: { lang?: Lang }) {
  const t = text[lang]
  const other: Lang = lang === 'fr' ? 'en' : 'fr'
  const booking = useBooking()
  const url = `${SITE_URL}${guidesIndexPaths[lang]}`
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `${url}#page`,
    url,
    name: t.indexSeoTitle,
    inLanguage: lang,
    isPartOf: { '@id': `${SITE_URL}/#website` },
    mainEntity: { '@type': 'ItemList', itemListElement: guides.map((guide, index) => ({ '@type': 'ListItem', position: index + 1, url: `${SITE_URL}${guidePaths(guide)[lang]}`, name: guide.text[lang].title })) },
  }
  return (
    <LangContext.Provider value={lang}>
      <div className="suite-page guide-page">
        <Seo lang={lang} page={guidesIndexPaths} title={t.indexSeoTitle} description={t.indexSeoDescription}><script type="application/ld+json">{JSON.stringify(jsonLd)}</script></Seo>
        <GuideFrame lang={lang} other={guidesIndexPaths[other]} back={{ to: paths.home[lang], label: t.home }} onBook={() => booking.open('terre')}>
          <main>
            <header className="guide-hero guide-index-hero page-width">
              <p className="eyebrow">{t.eyebrow}</p>
              <h1>{t.indexTitle[0]} <em>{t.indexTitle[1]}</em></h1>
              <p className="guide-lead">{t.indexLead}</p>
            </header>
            <div className="page-width guide-index">
              <ul className="guide-grid">{guides.map((guide) => <GuideCard key={guide.id} guide={guide} lang={lang} />)}</ul>
            </div>
          </main>
        </GuideFrame>
        <BookingModal suite={booking.suite} lang={lang} onClose={booking.close} />
      </div>
    </LangContext.Provider>
  )
}
