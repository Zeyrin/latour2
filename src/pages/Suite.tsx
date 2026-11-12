import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, ArrowUpRight, BedDouble, Check, Expand, Globe, Maximize2, Users } from 'lucide-react'
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
  const [slideIndex, setSlideIndex] = useState(0)
  const trackRef = useRef<HTMLDivElement>(null)
  const showPhoto = (step: number) => setPhotoIndex((current) => current === null ? null : (current + step + photos.length) % photos.length)
  const newWindow = (text: string) => ({ target: '_blank', rel: 'noopener', 'aria-label': `${text} ${t.newWindow}` })

  // Une fiche s'ouvre toujours en haut de page (le lien vient souvent du bas de l'accueil ou d'une autre fiche).
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    trackRef.current?.scrollTo({ left: 0, behavior: 'instant' })
  }, [id])

  /** La photo dont le bord gauche est le plus proche du bord gauche de la galerie. */
  function onTrackScroll() {
    const track = trackRef.current
    if (!track) return
    const slides = Array.from(track.children) as HTMLElement[]
    const atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4
    const nearest = atEnd ? slides.length - 1 : slides.reduce((best, el, i) => Math.abs(el.offsetLeft - track.scrollLeft) < Math.abs(slides[best].offsetLeft - track.scrollLeft) ? i : best, 0)
    setSlideIndex(nearest)
  }

  function slide(step: number) {
    const track = trackRef.current
    if (!track) return
    const target = track.children[Math.max(0, Math.min(photos.length - 1, slideIndex + step))] as HTMLElement | undefined
    if (target) track.scrollTo({ left: target.offsetLeft, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
  }

  // Glisser du doigt dans la visionneuse plein écran.
  const touchStart = useRef<number | null>(null)

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
          <Link to={`${paths.home[lang]}#les-suites`} className="suite-back"><ArrowLeft size={15} strokeWidth={1.25} />{p.back}</Link>
          <div className="suite-header-actions">
            <Link to={suitePaths(id)[other]} className="lang-switch" hrefLang={other} lang={other} aria-label={t.switchLang}><Globe size={14} strokeWidth={1.25} />{t.switchLabel}</Link>
            <button className="button header-cta" onClick={() => setBooking(true)}>{p.book} <ArrowUpRight size={15} strokeWidth={1.5} /></button>
          </div>
        </header>

        <main>
          <section className="suite-carousel" aria-label={p.photos}>
            {photos.length > 0
              ? <>
                <div className="suite-carousel-track" ref={trackRef} onScroll={onTrackScroll} tabIndex={0} aria-label={p.photos}>
                  {photos.map((src, index) => <button key={src} className="suite-slide" onClick={() => setPhotoIndex(index)} aria-label={`${t.enlarge} ${t.suitePhotoAlt(label, index + 1)}`}><img src={src} alt={t.suitePhotoAlt(label, index + 1)} loading={index < 3 ? 'eager' : 'lazy'} decoding="async" {...(index === 0 ? { fetchPriority: 'high' as const } : {})} /></button>)}
                </div>
                <button className="suite-carousel-arrow is-prev" aria-label={t.prevPhoto} onClick={() => slide(-1)} disabled={slideIndex === 0}><ArrowLeft size={20} strokeWidth={1.25} /></button>
                <button className="suite-carousel-arrow is-next" aria-label={t.nextPhoto} onClick={() => slide(1)} disabled={slideIndex >= photos.length - 1}><ArrowRight size={20} strokeWidth={1.25} /></button>
                <div className="suite-carousel-bar page-width">
                  <span className="suite-carousel-count">{String(slideIndex + 1).padStart(2, '0')} / {String(photos.length).padStart(2, '0')}</span>
                  <span className="suite-carousel-progress" aria-hidden="true"><span style={{ width: `${((slideIndex + 1) / photos.length) * 100}%` }} /></span>
                  <button type="button" className="suite-carousel-all" onClick={() => setPhotoIndex(slideIndex)}><Expand size={14} strokeWidth={1.25} />{t.showAllPhotos(photos.length)}</button>
                </div>
              </>
              : <div className="suite-carousel-empty"><Picture name="chateau-panorama" alt={t.domainStoneAlt} priority sizes="100vw" /><p>{p.noPhotos}</p></div>}
          </section>

          <section className="suite-intro page-width" aria-labelledby="suite-heading">
            <div>
              <p className="eyebrow">{String(number).padStart(2, '0')} / 05 · {t.suitesListEyebrow}</p>
              <h1 id="suite-heading">{label}</h1>
              <p className="suite-tagline">{detail.tagline}</p>
            </div>
            <ul className="suite-key-facts" aria-label={p.facts}>{facts.map((fact) => <li key={fact.label}>{fact.icon}<span><span className="suite-key-label">{fact.label}</span>{fact.value}</span></li>)}</ul>
          </section>

          <section className="suite-overview page-width" aria-label={p.features}>
            <div className="suite-story">
              {detail.story.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              <h2 className="suite-subheading">{p.features}</h2>
              <ul className="suite-checklist">{detail.features.map((feature) => <li key={feature}><Check size={16} strokeWidth={1.5} />{feature}</li>)}</ul>
              <h2 className="suite-subheading">{p.common}</h2>
              <ul className="suite-checklist suite-checklist-common">{suiteCommon[lang].map((feature) => <li key={feature}><Check size={15} strokeWidth={1.25} />{feature}</li>)}</ul>
            </div>
            <aside className="suite-book-card" aria-label={p.book}>
              <p className="suite-book-title">{label}</p>
              <dl>{facts.map((fact) => <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}</dl>
              <button className="button button-burgundy" onClick={() => setBooking(true)}>{p.book} <ArrowRight size={17} /></button>
              <p className="suite-note">{p.note}</p>
              <p className="ancv"><img src="/images/ancv.svg" alt="ANCV" width="45" height="25" loading="lazy" />{t.ancv}</p>
              <a className="suite-spa-link" href={spaUrl('fiche-suite', lang)} {...newWindow(p.spa)}>{p.spa}<ArrowUpRight size={15} strokeWidth={1.25} /></a>
            </aside>
          </section>

          <nav className="suite-others page-width" aria-labelledby="suite-others-heading">
            <h2 id="suite-others-heading" className="suite-subheading">{p.others}</h2>
            <ul>{suites[lang].filter((suite) => suite.id !== id).map((suite) => { const cover = suitePhotos[suite.id][0]; const otherDetail = suiteDetails[lang][suite.id]; return <li key={suite.id}><Link to={suitePaths(suite.id)[lang]}><span className="suite-others-image">{cover && <img src={cover} alt="" loading="lazy" decoding="async" />}</span><span className="suite-others-name">{suite.label}</span><span className="suite-others-facts">{otherDetail.surface} · {otherDetail.guests}</span></Link></li> })}</ul>
          </nav>
        </main>

        <div className="suite-mobile-bar"><span><strong>{label}</strong>{detail.surface} · {detail.guests}</span><button className="button button-burgundy" onClick={() => setBooking(true)}>{p.bookShort}</button></div>

        <footer className="suite-footer">
          <div className="page-width">
            <Link to={paths.home[lang]} aria-label={t.backToTop}><Brand /></Link>
            <address>{contact.address}, {contact.locality}<br /><a href={`tel:${contact.phoneLink}`}>{contact.phone}</a> · <a href={`mailto:${contact.email}`}>{contact.email}</a></address>
            <div className="suite-footer-links"><a href={GIFT_URL} {...newWindow(t.footerGift)}>{t.footerGift}</a><Link to={paths.legal[lang]}>{t.legal}</Link><Link to={paths.privacy[lang]}>{t.privacy}</Link></div>
          </div>
        </footer>

        {booking && <Modal title={t.bookingModal} onClose={() => setBooking(false)} className="content-modal booking-modal"><BookingForm initialUniverse="suites" initialSuite={id} /></Modal>}
        {photoIndex !== null && <Modal title={`${t.photo} ${label}`} onClose={() => setPhotoIndex(null)} className="lightbox"><div className="lightbox-image" onTouchStart={(event) => { touchStart.current = event.touches[0].clientX }} onTouchEnd={(event) => { if (touchStart.current === null) return; const dx = event.changedTouches[0].clientX - touchStart.current; touchStart.current = null; if (Math.abs(dx) > 40) showPhoto(dx < 0 ? 1 : -1) }}><AnimatePresence mode="wait"><motion.img key={photos[photoIndex]} src={photos[photoIndex]} alt={t.suitePhotoAlt(label, photoIndex + 1)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }} /></AnimatePresence></div><div className="lightbox-bottom"><div><p>{label}</p><span>{String(photoIndex + 1).padStart(2, '0')} / {String(photos.length).padStart(2, '0')}</span></div><div className="lightbox-controls"><button className="icon-button" aria-label={t.prevPhoto} onClick={() => showPhoto(-1)}><ArrowLeft size={22} strokeWidth={1.25} /></button><button className="icon-button" aria-label={t.nextPhoto} onClick={() => showPhoto(1)}><ArrowRight size={22} strokeWidth={1.25} /></button></div></div></Modal>}
      </div>
    </LangContext.Provider>
  )
}
