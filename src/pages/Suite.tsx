import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, ArrowUpRight, BedDouble, Globe, Maximize2, Plus, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Brand } from '../components/Brand'
import { BookingForm } from '../components/BookingForm'
import { Modal } from '../components/Modal'
import { Picture } from '../components/Picture'
import { Seo } from '../components/Seo'
import { GIFT_URL, SITE_URL, spaUrl, contact, suiteCommon, suiteDetails, suiteIds, suitePhotos, suites, type SuiteId } from '../lib/content'
import { LangContext, paths, suitePaths, type Lang } from '../lib/i18n'
import { ui } from '../lib/ui'

/** La page détaillée d'une suite : caractéristiques, photographies et réservation. */
export function SuitePage({ id, lang = 'fr' }: { id: SuiteId; lang?: Lang }) {
  const t = ui[lang]
  const p = t.suitePage
  const other: Lang = lang === 'fr' ? 'en' : 'fr'
  const detail = suiteDetails[lang][id]
  const label = suites[lang].find((suite) => suite.id === id)!.label
  const number = suiteIds.indexOf(id) + 1
  const photos = suitePhotos[id]
  const [booking, setBooking] = useState(false)
  const [photoIndex, setPhotoIndex] = useState<number | null>(null)
  const [galleryExpanded, setGalleryExpanded] = useState(false)
  const previewCount = 6
  const shownPhotos = galleryExpanded ? photos : photos.slice(0, previewCount)
  const showPhoto = (step: number) => setPhotoIndex((current) => current === null ? null : (current + step + photos.length) % photos.length)
  const newWindow = (text: string) => ({ target: '_blank', rel: 'noopener', 'aria-label': `${text} ${t.newWindow}` })

  useEffect(() => {
    if (photoIndex === null) return
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') showPhoto(1)
      if (event.key === 'ArrowLeft') showPhoto(-1)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  })

  const facts = [
    { icon: <Maximize2 size={20} strokeWidth={1} />, label: p.surface, value: detail.surface },
    { icon: <Users size={20} strokeWidth={1} />, label: p.guests, value: detail.guests },
    { icon: <BedDouble size={20} strokeWidth={1} />, label: p.beds, value: detail.beds },
  ]

  return (
    <LangContext.Provider value={lang}>
      <div className={`suite-page suite-page-${id}`}>
        <Seo lang={lang} page={suitePaths(id)} title={p.seoTitle(label)} description={`${label} : ${detail.tagline} ${detail.surface}, ${detail.guests.toLowerCase()}, ${detail.beds}.`} image={photos[0] ? `${SITE_URL}${photos[0]}` : undefined} />
        <header className="suite-header">
          <Link to={paths.home[lang]} className="suite-header-brand" aria-label={t.homeLabel}><Brand /></Link>
          <div className="suite-header-actions">
            <Link to={suitePaths(id)[other]} className="lang-switch" hrefLang={other} lang={other} aria-label={t.switchLang}><Globe size={14} strokeWidth={1.25} />{t.switchLabel}</Link>
            <button className="button header-cta" onClick={() => setBooking(true)}>{p.book} <ArrowUpRight size={15} strokeWidth={1.5} /></button>
          </div>
        </header>

        <main>
          <section className="suite-hero" aria-labelledby="suite-heading">
            <div className="suite-hero-image">
              {photos[0] ? <img src={photos[0]} alt={t.suitePhotoAlt(label, 1)} fetchPriority="high" /> : <Picture name="chateau-panorama" alt={t.domainStoneAlt} priority sizes="100vw" />}
            </div>
            <div className="suite-hero-shade" />
            <div className="suite-hero-content page-width">
              <Link to={`${paths.home[lang]}#les-suites`} className="suite-back"><ArrowLeft size={15} strokeWidth={1.25} />{p.back}</Link>
              <p className="eyebrow">{String(number).padStart(2, '0')} / 05 · {t.suitesListEyebrow}</p>
              <h1 id="suite-heading">{label}</h1>
              <p className="suite-tagline">{detail.tagline}</p>
            </div>
          </section>

          <section className="suite-overview page-width" aria-label={p.facts}>
            <div className="suite-story">
              {detail.story.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              <p className="suite-note">{p.note}</p>
              <p className="ancv"><img src="/images/ancv.svg" alt="ANCV" width="45" height="25" loading="lazy" />{t.ancv}</p>
              <button className="button button-burgundy" onClick={() => setBooking(true)}>{p.book} <ArrowRight size={17} /></button>
            </div>
            <aside className="suite-facts">
              <h2 className="suite-subheading">{p.facts}</h2>
              <dl>{facts.map((fact) => <div key={fact.label}>{fact.icon}<dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}</dl>
              <h2 className="suite-subheading">{p.features}</h2>
              <ul className="suite-features">{detail.features.map((feature) => <li key={feature}>{feature}</li>)}</ul>
              <h2 className="suite-subheading">{p.common}</h2>
              <ul className="suite-features suite-features-common">{suiteCommon[lang].map((feature) => <li key={feature}>{feature}</li>)}</ul>
            </aside>
          </section>

          <section className="suite-gallery page-width" aria-labelledby="suite-gallery-heading">
            <h2 id="suite-gallery-heading" className="suite-subheading">{p.photos}</h2>
            {photos.length > 0
              ? <><div className="suite-gallery-grid">{shownPhotos.map((src, index) => <button key={src} className="gallery-photo" onClick={() => setPhotoIndex(index)} aria-label={`${t.enlarge} ${t.suitePhotoAlt(label, index + 1)}`}><img src={src} alt="" loading="lazy" decoding="async" /><span className="gallery-photo-overlay" /><span className="gallery-plus"><Plus size={19} strokeWidth={1.2} /></span></button>)}</div>{photos.length > previewCount && <div className="gallery-more"><button type="button" className="text-link" onClick={() => setGalleryExpanded((open) => !open)} aria-expanded={galleryExpanded}>{galleryExpanded ? t.showFewerPhotos : t.showAllPhotos(photos.length)}</button></div>}</>
              : <p className="suite-no-photos">{p.noPhotos}</p>}
          </section>

          <section className="suite-spa page-width">
            <a href={spaUrl('fiche-suite', lang)} {...newWindow(p.spa)}><Picture name="spa-piscine" alt="" sizes="(max-width: 700px) 100vw, 40vw" /><span><span className="eyebrow">spaterrehappy.fr</span>{p.spa}<ArrowUpRight size={20} strokeWidth={1.2} /></span></a>
          </section>

          <nav className="suite-others page-width" aria-labelledby="suite-others-heading">
            <h2 id="suite-others-heading" className="suite-subheading">{p.others}</h2>
            <ul>{suites[lang].filter((suite) => suite.id !== id).map((suite) => <li key={suite.id}><Link to={suitePaths(suite.id)[lang]}><span>{suite.label}</span><span className="suite-others-facts">{suiteDetails[lang][suite.id].surface} · {suiteDetails[lang][suite.id].guests}</span><ArrowRight size={16} strokeWidth={1.25} /></Link></li>)}</ul>
          </nav>
        </main>

        <footer className="suite-footer">
          <div className="page-width">
            <Link to={paths.home[lang]} aria-label={t.backToTop}><Brand /></Link>
            <address>{contact.address}, {contact.locality}<br /><a href={`tel:${contact.phoneLink}`}>{contact.phone}</a> · <a href={`mailto:${contact.email}`}>{contact.email}</a></address>
            <div className="suite-footer-links"><a href={GIFT_URL} {...newWindow(t.footerGift)}>{t.footerGift}</a><Link to={paths.legal[lang]}>{t.legal}</Link><Link to={paths.privacy[lang]}>{t.privacy}</Link></div>
          </div>
        </footer>

        {booking && <Modal title={t.bookingModal} onClose={() => setBooking(false)} className="content-modal booking-modal"><BookingForm initialUniverse="suites" initialSuite={id} /></Modal>}
        {photoIndex !== null && <Modal title={`${t.photo} ${label}`} onClose={() => setPhotoIndex(null)} className="lightbox"><div className="lightbox-image"><AnimatePresence mode="wait"><motion.img key={photos[photoIndex]} src={photos[photoIndex]} alt={t.suitePhotoAlt(label, photoIndex + 1)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }} /></AnimatePresence></div><div className="lightbox-bottom"><div><p>{label}</p><span>{String(photoIndex + 1).padStart(2, '0')} / {String(photos.length).padStart(2, '0')}</span></div><div className="lightbox-controls"><button className="icon-button" aria-label={t.prevPhoto} onClick={() => showPhoto(-1)}><ArrowLeft size={22} strokeWidth={1.25} /></button><button className="icon-button" aria-label={t.nextPhoto} onClick={() => showPhoto(1)}><ArrowRight size={22} strokeWidth={1.25} /></button></div></div></Modal>}
      </div>
    </LangContext.Provider>
  )
}
