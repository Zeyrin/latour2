import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from 'framer-motion'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, ChevronDown, Globe, Instagram, MapPin, Menu, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import Lenis from 'lenis'
import 'lenis/dist/lenis.css'
import { Brand, ChateauSketch } from './components/Brand'
import { Modal } from './components/Modal'
import { Picture } from './components/Picture'
import { BookingForm } from './components/BookingForm'
import { Seo } from './components/Seo'
import { SITE_URL, SPA_URL, contact, escapes, galleryPhotos, spa, universes, type GalleryFilter, type Universe, type UniverseId } from './lib/content'
import { LangContext, paths, type Lang } from './lib/i18n'
import { ui } from './lib/ui'

type ModalState =
  | { type: 'booking'; universe?: UniverseId; message?: string }
  | { type: 'universe'; id: UniverseId }
  | { type: 'escape'; id: string }
  | { type: 'story' }
  | null

function Reveal({ children, className = '', delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return <motion.div className={className} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.08, margin: '0px 0px 80px 0px' }} transition={{ duration: 0.85, delay, ease: [0.22, 1, 0.36, 1] }}>{children}</motion.div>
}

function Chapter({ universe, caption, onDiscover }: { universe: Universe; caption: string; onDiscover: () => void }) {
  return (
    <section className={`chapter chapter-${universe.id}`} id={universe.id} aria-labelledby={`heading-${universe.id}`}>
      <div className="chapter-inner page-width">
        <Reveal className="chapter-visual">
          <div className="chapter-image-wrap"><Picture name={universe.image} alt={universe.imageAlt} /><span className="image-index">{universe.number} <span>/</span> 03</span></div>
          <span className="photo-caption">{universe.art} — {caption}</span>
        </Reveal>
        <Reveal className="chapter-copy" delay={0.12}>
          <p className="eyebrow"><span className="chapter-number">{universe.number}</span>{universe.label}</p>
          <h2 id={`heading-${universe.id}`}>{universe.heading[0]}<br /><em>{universe.heading[1]}</em></h2>
          <p>{universe.description}</p>
          <p>{universe.detail}</p>
          <ul className="chapter-features">{universe.features.map((feature) => <li key={feature}>{feature}</li>)}</ul>
          <button className="text-link" onClick={onDiscover}>{universe.action}<span className="arrow-circle"><ArrowUpRight size={20} strokeWidth={1.25} /></span></button>
        </Reveal>
      </div>
    </section>
  )
}

function jsonLd(lang: Lang) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Hotel',
    name: 'Château Latour Ségur',
    description: ui[lang].jsonLdDescription,
    url: `${SITE_URL}${paths.home[lang]}`,
    inLanguage: lang,
    image: [`${SITE_URL}/images/domaine.webp`, `${SITE_URL}/images/suites.webp`, `${SITE_URL}/images/spa-piscine.webp`],
    telephone: contact.phoneLink,
    email: contact.email,
    address: { '@type': 'PostalAddress', streetAddress: '1 Lieu dit Latour', postalCode: '33570', addressLocality: 'Lussac', addressRegion: 'Gironde', addressCountry: 'FR' },
    hasMap: contact.map,
    sameAs: ['https://www.instagram.com/chateaulatoursegur/', SPA_URL],
    amenityFeature: [{ '@type': 'LocationFeatureSpecification', name: 'Spa', value: true }, { '@type': 'LocationFeatureSpecification', name: ui[lang].jsonLdMeeting, value: true }],
  }
}

function App({ lang = 'fr' }: { lang?: Lang }) {
  const t = ui[lang]
  const s = spa[lang]
  const langUniverses = universes[lang]
  const other: Lang = lang === 'fr' ? 'en' : 'fr'
  const [loading, setLoading] = useState(true)
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [modal, setModal] = useState<ModalState>(null)
  const [filter, setFilter] = useState<GalleryFilter>('tous')
  const [lightbox, setLightbox] = useState<number | null>(null)
  const lenisRef = useRef<Lenis | null>(null)
  const reducedMotion = useReducedMotion()
  const visiblePhotos = galleryPhotos[lang].filter((photo) => filter === 'tous' || photo.category === filter)
  const lightboxPhoto = lightbox !== null ? visiblePhotos[lightbox] : undefined

  useEffect(() => {
    let cancelled = false
    const timeout = window.setTimeout(() => setLoading(false), 2500)
    const heroImage = document.querySelector<HTMLImageElement>('.hero-image img')
    const minimum = new Promise((resolve) => window.setTimeout(resolve, 800))
    Promise.allSettled([heroImage?.decode(), document.fonts.ready, minimum]).then(() => {
      if (!cancelled) { window.clearTimeout(timeout); setLoading(false) }
    })
    const onScroll = () => setScrolled(window.scrollY > 45)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      lenisRef.current = new Lenis({ autoRaf: true, duration: 1.15, smoothWheel: true, anchors: { offset: -88 } })
    }
    return () => {
      cancelled = true
      window.clearTimeout(timeout)
      window.removeEventListener('scroll', onScroll)
      lenisRef.current?.destroy()
    }
  }, [])

  useEffect(() => {
    if (modal || menuOpen || lightbox !== null) lenisRef.current?.stop()
    else lenisRef.current?.start()
  }, [modal, menuOpen, lightbox])

  useEffect(() => {
    if (lightbox === null) return
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') setLightbox((current) => ((current ?? 0) + 1) % visiblePhotos.length)
      if (event.key === 'ArrowLeft') setLightbox((current) => ((current ?? 0) - 1 + visiblePhotos.length) % visiblePhotos.length)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [lightbox, visiblePhotos.length])

  function book(universe?: UniverseId, message?: string) {
    setMenuOpen(false)
    setModal({ type: 'booking', universe, message })
  }

  function navigateFromMenu(id: string) {
    setMenuOpen(false)
    window.setTimeout(() => {
      const target = document.getElementById(id)
      if (!target) return
      if (lenisRef.current) lenisRef.current.scrollTo(target, { offset: -80, force: true })
      else target.scrollIntoView({ behavior: 'auto' })
      window.history.replaceState(null, '', `#${id}`)
    }, 80)
  }

  const spaLink = (className: string, label: string) => <a className={className} href={SPA_URL} target="_blank" rel="noopener" aria-label={`${label} ${t.newWindow}`}>{label}<ArrowUpRight size={16} strokeWidth={1.25} /></a>

  return (
    <LangContext.Provider value={lang}>
    <MotionConfig reducedMotion="user">
      <Seo lang={lang} page="home" title={t.seoTitle} description={t.seoDescription}><script type="application/ld+json">{JSON.stringify(jsonLd(lang))}</script></Seo>
      <AnimatePresence>
        {loading && <motion.div className="preloader" aria-hidden="true" initial={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reducedMotion ? 0.1 : 0.6 }}><ChateauSketch /><Brand /><span className="preloader-line" /></motion.div>}
      </AnimatePresence>

      <a href="#univers" className="skip-link">{t.skip}</a>
      <header className={`site-header ${scrolled ? 'is-scrolled' : ''}`}>
        <a href="#accueil" className="header-brand" aria-label={t.homeLabel}><Brand /></a>
        <nav className="desktop-nav" aria-label={t.mainNav}>
          <a href="#domaine">{t.nav.domaine}</a>
          <a href="#univers">{t.nav.univers}</a>
          <a href="#spa-terrehappy">{t.nav.spa}</a>
          <a href="#echappees">{t.nav.echappees}</a>
          <a href="#galerie">{t.nav.galerie}</a>
        </nav>
        <div className="header-actions">
          <Link to={paths.home[other]} className="lang-switch" hrefLang={other} lang={other} aria-label={t.switchLang}><Globe size={14} strokeWidth={1.25} />{t.switchLabel}</Link>
          <button className="button header-cta" onClick={() => book()}>{t.cta} <ArrowUpRight size={15} strokeWidth={1.5} /></button>
          <button className="menu-toggle" onClick={() => setMenuOpen(true)} aria-label={t.openMenu} aria-expanded={menuOpen}><span>{t.menu}</span><Menu size={25} strokeWidth={1.2} /></button>
        </div>
      </header>

      <main>
        <section className="hero" id="accueil" aria-labelledby="hero-heading">
          <div className="hero-image"><picture><source media="(max-width: 700px)" srcSet="/images/domaine-mobile.webp" /><img src="/images/domaine.webp" alt={t.heroAlt} fetchPriority="high" loading="eager" decoding="sync" /></picture></div>
          <div className="hero-shade" />
          <motion.div className="hero-content" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.15, delay: 0.65 }}>
            <p className="eyebrow hero-eyebrow"><span />{t.heroEyebrow}<span /></p>
            <h1 id="hero-heading">{t.heroTitle[0]}<br /><em>{t.heroTitle[1]}</em></h1>
            <p className="hero-subtitle">{t.heroSubtitle[0]}{' '}<br />{t.heroSubtitle[1]}</p>
            <a href="#univers" className="hero-discover">{t.heroDiscover} <ArrowDown size={15} strokeWidth={1.5} /></a>
          </motion.div>
          <div className="hero-bottom">
            <span className="hero-location"><MapPin size={14} strokeWidth={1.25} />{t.heroLocation}</span>
            <a href="#univers" className="scroll-cue" aria-label={t.scrollCue}><span>{t.scrollCueText}</span><span className="scroll-line" /></a>
            <div className="heritage-mark"><ChateauSketch /><span>{t.heritage[0]}<br /><span>{t.heritage[1]}</span></span></div>
          </div>
        </section>

        <section className="universes-section section-space" id="univers" aria-labelledby="universes-heading">
          <div className="page-width">
            <Reveal className="section-heading triptych-heading">
              <div><p className="eyebrow">{t.universesEyebrow}</p><h2 id="universes-heading">{t.universesTitle[0]}<br className="mobile-break" /> <em>{t.universesTitle[1]}</em></h2></div>
              <p className="section-intro">{t.universesIntro[0]}{' '}<br />{t.universesIntro[1]}</p>
            </Reveal>
            <div className="triptych">
              {langUniverses.map((universe, index) => <Reveal key={universe.id} delay={index * 0.1} className="triptych-reveal"><a href={`#${universe.id}`} className={`universe-card universe-${universe.id}`}>
                <Picture name={universe.image} alt={universe.imageAlt} sizes="(max-width: 700px) 100vw, 33vw" />
                <div className="universe-shade" />
                <div className="universe-top"><span>{universe.number}</span><span>{universe.art}</span></div>
                <div className="universe-bottom"><h3>{universe.title[0]}<br /><em>{universe.title[1]}</em></h3><p>{universe.tagline}</p><span className="universe-link">{t.discoverUniverse} <span className="arrow-circle"><ArrowUpRight size={21} strokeWidth={1.2} /></span></span></div>
              </a></Reveal>)}
            </div>
            <Reveal className="triptych-footnote"><span />{t.triptychNote}<span /></Reveal>
          </div>
        </section>

        <section className="domain-section section-space" id="domaine" aria-labelledby="domain-heading">
          <div className="domain-grid page-width">
            <Reveal className="domain-visual"><div className="domain-main-photo"><Picture name="parc" alt={t.domainParcAlt} /></div><div className="domain-small-photo"><Picture name="chateau-panorama" alt={t.domainStoneAlt} /><span>{t.domainSmall}</span></div><span className="vertical-caption">{t.domainVertical}</span></Reveal>
            <Reveal className="domain-copy" delay={0.12}>
              <p className="eyebrow">{t.domainEyebrow}</p>
              <h2 id="domain-heading">{t.domainTitle[0]}<br /><em>{t.domainTitle[1]}</em></h2>
              <p>{t.domainLead[0]}<br />{t.domainLead[1]}</p>
              <p>{t.domainText}</p>
              <blockquote>{t.domainQuote}</blockquote>
              <div className="host-signature"><span>Corinne & André</span><span className="eyebrow">{t.hosts}</span></div>
              <button className="text-link" onClick={() => setModal({ type: 'story' })}>{t.storyLink} <ArrowUpRight size={18} strokeWidth={1.2} /></button>
            </Reveal>
          </div>
          <Reveal className="domain-values page-width"><div><ChateauSketch /><span>{t.values.house[0]}<br /><em>{t.values.house[1]}</em></span></div><span className="value-separator" /><p>{t.values.calm[0]}<br /><em>{t.values.calm[1]}</em></p><span className="value-separator" /><div className="domain-address"><MapPin size={25} strokeWidth={0.8} /><span>{t.values.vines[0]}<br /><em>{t.values.vines[1]}</em></span></div></Reveal>
        </section>

        <div className="chapters">{langUniverses.map((universe) => <Chapter key={universe.id} universe={universe} caption={t.photoCaption} onDiscover={() => setModal({ type: 'universe', id: universe.id })}/>)}</div>

        <section className="spa-section section-space" id="spa-terrehappy" aria-labelledby="spa-heading"><div className="page-width">
          <Reveal className="spa-intro">
            <div>
              <p className="eyebrow">{s.eyebrow}</p>
              <h2 id="spa-heading">{s.heading[0]}<br /><em>{s.heading[1]}</em></h2>
            </div>
            <div className="spa-intro-copy">
              {s.intro.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              <p className="spa-open">{s.open}</p>
            </div>
          </Reveal>

          <h3 className="spa-subheading">{s.spacesTitle}</h3>
          <div className="spa-spaces">{s.spaces.map((space, index) => <Reveal key={space.title} delay={index * 0.08} className="spa-space">
            <div className="spa-space-image"><Picture name={space.image} alt={space.alt} sizes="(max-width: 700px) 100vw, 25vw" /></div>
            <h4>{space.title}</h4>
            <p>{space.text}</p>
          </Reveal>)}</div>

          <div className="spa-columns">
            <Reveal className="spa-treatments">
              <h3 className="spa-subheading">{s.treatmentsTitle}</h3>
              <dl>{s.treatments.map((item) => <div key={item.title}><dt>{item.title}</dt><dd>{item.text}</dd></div>)}</dl>
            </Reveal>
            <Reveal className="spa-formulas" delay={0.1}>
              <h3 className="spa-subheading">{s.formulasTitle}</h3>
              <ul>{s.formulas.map((item) => <li key={item.title}><div><span className="spa-formula-title">{item.title}</span><span className="spa-formula-price">{item.price}</span></div><p>{item.text}</p></li>)}</ul>
              <p className="spa-note">{s.pricesNote}</p>
            </Reveal>
          </div>

          <Reveal className="spa-actions">
            {spaLink('button button-burgundy spa-site-link', s.siteCta)}
            <button className="text-link" onClick={() => book('spa', s.bookRequest)}>{s.bookCta} <ArrowRight size={16} strokeWidth={1.25} /></button>
            <button className="text-link" onClick={() => book('spa', s.giftRequest)}>{s.giftCta} <ArrowUpRight size={16} strokeWidth={1.25} /></button>
          </Reveal>
        </div></section>

        <section className="escapes-section section-space" id="echappees" aria-labelledby="escapes-heading"><div className="page-width">
          <Reveal className="section-heading"><div><p className="eyebrow">{t.escapesEyebrow}</p><h2 id="escapes-heading">{t.escapesTitle[0]} <em>{t.escapesTitle[1]}</em></h2></div><p className="section-intro">{t.escapesIntro[0]}{' '}<br />{t.escapesIntro[1]}</p></Reveal>
          <div className="escape-grid">{escapes[lang].map((escape, index) => <Reveal key={escape.id} delay={index * 0.1}><button className="escape-card" onClick={() => setModal({ type: 'escape', id: escape.id })}><div className="escape-image"><Picture name={escape.image} alt={escape.alt} sizes="(max-width: 700px) 100vw, 33vw" /><span className="escape-image-arrow"><ArrowUpRight size={20} strokeWidth={1.25} /></span></div><div className="escape-card-content"><p className="eyebrow">{escape.label}</p><h3>{escape.title}</h3><p>{escape.text}</p><span className="text-link">{t.composeEscape} <ArrowRight size={16} strokeWidth={1.25} /></span></div></button></Reveal>)}</div>
          <Reveal className="gift-note"><span>{t.gift[0]} <em>{t.gift[1]}</em></span><button className="text-link" onClick={() => book(undefined, t.giftRequest)}>{t.giftCta} <ArrowUpRight size={17} strokeWidth={1.25} /></button></Reveal>
        </div></section>

        <section className="interlude" aria-label={t.interludeLabel}><Picture name="chateau-panorama" alt={t.interludeAlt} sizes="100vw" /><div className="interlude-shade" /><Reveal className="interlude-content"><p className="eyebrow">{t.interludeEyebrow}</p><p className="interlude-quote">{t.interludeQuote[0]}{' '}<br />{t.interludeQuote[1]} <em>{t.interludeQuote[2]}</em></p><span className="interlude-line" /></Reveal></section>

        <section className="gallery-section section-space" id="galerie" aria-labelledby="gallery-heading"><div className="page-width">
          <Reveal className="gallery-heading"><p className="eyebrow">{t.galleryEyebrow}</p><h2 id="gallery-heading">{t.galleryTitle[0]} <em>{t.galleryTitle[1]}</em></h2><p>{t.galleryIntro}</p></Reveal>
          <div className="gallery-filters" aria-label={t.galleryFilterLabel}>{(['tous', 'suites', 'spa', 'evenements'] as GalleryFilter[]).map((id) => <button key={id} className={filter === id ? 'is-active' : ''} onClick={() => setFilter(id)} aria-pressed={filter === id}>{t.galleryFilters[id]}{filter === id && <motion.span className="filter-underline" layoutId="gallery-filter" transition={{ duration: 0.4 }} />}</button>)}</div>
          <motion.div layout className={`gallery-grid ${filter !== 'tous' ? 'is-filtered' : ''}`}><AnimatePresence mode="popLayout">{visiblePhotos.map((photo, index) => <motion.button layout key={photo.id} className="gallery-photo" onClick={() => setLightbox(index)} aria-label={`${t.enlarge} ${photo.title}`} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}><Picture name={photo.image} alt={photo.alt} sizes="(max-width: 640px) 50vw, 33vw" /><span className="gallery-photo-overlay" /><span className="gallery-photo-title">{photo.title}</span><span className="gallery-plus"><Plus size={19} strokeWidth={1.2} /></span></motion.button>)}</AnimatePresence></motion.div>
          <p className="gallery-note">{t.galleryNote}</p>
        </div></section>

        <section className="closing-section" id="contact" aria-labelledby="closing-heading"><ChateauSketch className="closing-sketch" /><Reveal className="closing-content"><p className="eyebrow">{t.closingEyebrow}</p><h2 id="closing-heading">{t.closingTitle[0]}<br /><em>{t.closingTitle[1]}</em></h2><p>{t.closingText[0]}<br />{t.closingText[1]}</p><div className="closing-choices">{langUniverses.map((universe) => <button key={universe.id} onClick={() => book(universe.id)}>{t.closingChoices[universe.id]}<ArrowUpRight size={17} strokeWidth={1.25} /></button>)}</div><span className="closing-signature">Corinne & André</span></Reveal></section>
      </main>

      <footer className="site-footer"><div className="footer-main page-width">
        <div className="footer-brand"><a href="#accueil" aria-label={t.backToTop}><Brand sketch /></a><p>{t.footerTagline[0]}<br />{t.footerTagline[1]}</p></div>
        <div className="footer-column"><h3>{t.footerHouse}</h3><a href="#domaine">{t.menuLinks.domaine}</a><a href="#suites">{t.menuLinks.suites}</a><a href="#spa-terrehappy">{t.menuLinks.spa}</a><a href="#evenements">{t.menuLinks.evenements}</a></div>
        <div className="footer-column"><h3>{t.footerMoments}</h3><a href="#echappees">{t.menuLinks.echappees}</a><button onClick={() => book(undefined, t.footerGiftRequest)}>{t.footerGift}</button><a href="#galerie">{t.menuLinks.galerie}</a><button onClick={() => book()}>{t.footerPlan}</button>{spaLink('footer-external', t.spaSite)}</div>
        <div className="footer-column footer-contact"><h3>{t.footerContact}</h3><address>{contact.address}<br />{contact.locality}</address><a href={`tel:${contact.phoneLink}`}>{contact.phone}</a><a className="footer-email" href={`mailto:${contact.email}`}>{contact.email}</a><a href={contact.map} target="_blank" rel="noopener noreferrer" className="footer-map">{t.directions} <ArrowUpRight size={14} /></a></div>
      </div><div className="footer-bottom page-width"><p>© {new Date().getFullYear()} Château Latour Ségur</p><div><Link to={paths.legal[lang]}>{t.legal}</Link><Link to={paths.privacy[lang]}>{t.privacy}</Link><Link to={paths.home[other]} hrefLang={other} lang={other}>{t.switchLang}</Link></div><a className="instagram-link" href="https://www.instagram.com/chateaulatoursegur/" target="_blank" rel="noopener noreferrer" aria-label={t.instagramLabel}><Instagram size={17} strokeWidth={1.2} /><span>{t.instagramText}</span><ArrowUpRight size={13} /></a></div></footer>

      {menuOpen && <Modal title={t.menuTitle} onClose={() => setMenuOpen(false)} className="mobile-menu"><Brand sketch /><p className="eyebrow">{t.menuWelcome}</p><nav aria-label={t.mobileNav}>{([['domaine', t.menuLinks.domaine], ['suites', t.menuLinks.suites], ['spa-terrehappy', t.menuLinks.spa], ['evenements', t.menuLinks.evenements], ['echappees', t.menuLinks.echappees], ['galerie', t.menuLinks.galerie]] as const).map(([id, text], index) => <button key={id} onClick={() => navigateFromMenu(id)}><span>0{index + 1}</span>{text}<ArrowUpRight size={18} strokeWidth={1.2} /></button>)}</nav><button className="button button-burgundy" onClick={() => book()}>{t.cta} <ArrowUpRight size={17} /></button><a className="mobile-menu-phone" href={`tel:${contact.phoneLink}`}>{contact.phone}</a><Link className="mobile-menu-lang" to={paths.home[other]} hrefLang={other} lang={other} onClick={() => setMenuOpen(false)}><Globe size={15} strokeWidth={1.25} />{t.switchLang}</Link></Modal>}

      {modal && <Modal key={modal.type} title={modal.type === 'booking' ? t.bookingModal : t.discoverModal} onClose={() => setModal(null)} className={`content-modal ${modal.type === 'booking' ? 'booking-modal' : ''}`}>
        {modal.type === 'booking' && <BookingForm initialUniverse={modal.universe} initialMessage={modal.message} />}
        {modal.type === 'universe' && (() => { const universe = langUniverses.find((item) => item.id === modal.id)!; return <><div className="detail-image"><Picture name={universe.image} alt={universe.imageAlt} /></div><div className="detail-body"><p className="eyebrow">{universe.art}</p><h2>{universe.title[0]}<br /><em>{universe.title[1]}</em></h2><p>{universe.description}</p><div className="detail-options">{universe.options.map((option, index) => <details key={option.title} open={index === 0}><summary>{option.title}<ChevronDown size={18} strokeWidth={1.25} /></summary><p>{option.text}</p></details>)}</div><p className="detail-note">{t.detailNote}</p><div className="detail-actions"><button className="button button-burgundy" onClick={() => book(universe.id)}>{t.detailCta} <ArrowRight size={17} /></button>{universe.id === 'spa' && <a className="text-link" href="#spa-terrehappy" onClick={() => setModal(null)}>{t.spaDetailLink} <ArrowDown size={16} strokeWidth={1.25} /></a>}</div></div></> })()}
        {modal.type === 'escape' && (() => { const escape = escapes[lang].find((item) => item.id === modal.id)!; return <><div className="detail-image"><Picture name={escape.image} alt={escape.alt} /></div><div className="detail-body"><p className="eyebrow">{escape.label}</p><h2>{escape.title}</h2><p>{escape.text}</p><p>{t.escapeText}</p><p className="detail-note">{t.escapeNote}</p><button className="button button-burgundy" onClick={() => book(escape.universe, escape.request)}>{t.composeEscape} <ArrowRight size={17} /></button></div></> })()}
        {modal.type === 'story' && <><div className="detail-image"><Picture name="domaine" alt={t.storyAlt} /></div><div className="detail-body"><p className="eyebrow">{t.storyEyebrow}</p><h2>{t.storyTitle[0]}<br /><em>{t.storyTitle[1]}</em></h2>{t.story.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}<span className="story-signature">{t.storySignature}</span><button className="button button-burgundy" onClick={() => book()}>{t.storyCta} <ArrowRight size={17} /></button></div></>}
      </Modal>}

      {lightboxPhoto && lightbox !== null && <Modal title={`${t.photo} ${lightboxPhoto.title}`} onClose={() => setLightbox(null)} className="lightbox"><div className="lightbox-image"><AnimatePresence mode="wait"><motion.img key={lightboxPhoto.id} src={`/images/${lightboxPhoto.image}.webp`} alt={lightboxPhoto.alt} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }} /></AnimatePresence></div><div className="lightbox-bottom"><div><p>{lightboxPhoto.title}</p><span>{String(lightbox + 1).padStart(2, '0')} / {String(visiblePhotos.length).padStart(2, '0')}</span></div><div className="lightbox-controls"><button className="icon-button" aria-label={t.prevPhoto} onClick={() => setLightbox((lightbox - 1 + visiblePhotos.length) % visiblePhotos.length)}><ArrowLeft size={22} strokeWidth={1.25} /></button><button className="icon-button" aria-label={t.nextPhoto} onClick={() => setLightbox((lightbox + 1) % visiblePhotos.length)}><ArrowRight size={22} strokeWidth={1.25} /></button></div></div></Modal>}
    </MotionConfig>
    </LangContext.Provider>
  )
}

export default App
