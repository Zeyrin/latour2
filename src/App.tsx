import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from 'framer-motion'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, ChevronDown, Instagram, MapPin, Menu, Plus } from 'lucide-react'
import Lenis from 'lenis'
import 'lenis/dist/lenis.css'
import { Brand, ChateauSketch } from './components/Brand'
import { Modal } from './components/Modal'
import { Picture } from './components/Picture'
import { BookingForm } from './components/BookingForm'
import { contact, escapes, galleryPhotos, universes, type GalleryFilter, type Universe, type UniverseId } from './lib/content'

type ModalState =
  | { type: 'booking'; universe?: UniverseId; message?: string }
  | { type: 'universe'; id: UniverseId }
  | { type: 'escape'; id: string }
  | { type: 'story' }
  | { type: 'legal' }
  | { type: 'privacy' }
  | null

function Reveal({ children, className = '', delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return <motion.div className={className} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.08, margin: '0px 0px 80px 0px' }} transition={{ duration: 0.85, delay, ease: [0.22, 1, 0.36, 1] }}>{children}</motion.div>
}

function Chapter({ universe, onDiscover }: { universe: Universe; onDiscover: () => void }) {
  return (
    <section className={`chapter chapter-${universe.id}`} id={universe.id} aria-labelledby={`heading-${universe.id}`}>
      <div className="chapter-inner page-width">
        <Reveal className="chapter-visual">
          <div className="chapter-image-wrap"><Picture name={universe.image} alt={universe.imageAlt} /><span className="image-index">{universe.number} <span>/</span> 03</span></div>
          <span className="photo-caption">{universe.art} — Château Latour Ségur</span>
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

function App() {
  const [loading, setLoading] = useState(true)
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [modal, setModal] = useState<ModalState>(null)
  const [filter, setFilter] = useState<GalleryFilter>('tous')
  const [lightbox, setLightbox] = useState<number | null>(null)
  const lenisRef = useRef<Lenis | null>(null)
  const reducedMotion = useReducedMotion()
  const visiblePhotos = galleryPhotos.filter((photo) => filter === 'tous' || photo.category === filter)
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

  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence>
        {loading && <motion.div className="preloader" aria-hidden="true" initial={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reducedMotion ? 0.1 : 0.6 }}><ChateauSketch /><Brand /><span className="preloader-line" /></motion.div>}
      </AnimatePresence>

      <a href="#univers" className="skip-link">Aller au contenu</a>
      <header className={`site-header ${scrolled ? 'is-scrolled' : ''}`}>
        <a href="#accueil" className="header-brand" aria-label="Château Latour Ségur, accueil"><Brand /></a>
        <nav className="desktop-nav" aria-label="Navigation principale">
          <a href="#domaine">Le domaine</a>
          <a href="#univers">Nos trois univers</a>
          <a href="#echappees">Week-ends & cures</a>
          <a href="#galerie">Galerie</a>
        </nav>
        <button className="button header-cta" onClick={() => book()}>Préparer ma venue <ArrowUpRight size={15} strokeWidth={1.5} /></button>
        <button className="menu-toggle" onClick={() => setMenuOpen(true)} aria-label="Ouvrir le menu" aria-expanded={menuOpen}><span>Menu</span><Menu size={25} strokeWidth={1.2} /></button>
      </header>

      <main>
        <section className="hero" id="accueil" aria-labelledby="hero-heading">
          <div className="hero-image"><picture><source media="(max-width: 700px)" srcSet="/images/domaine-mobile.webp" /><img src="/images/domaine.webp" alt="La façade de pierre du Château Latour Ségur, nichée au cœur de son parc arboré" fetchPriority="high" loading="eager" decoding="sync" /></picture></div>
          <div className="hero-shade" />
          <motion.div className="hero-content" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.15, delay: 0.65 }}>
            <p className="eyebrow hero-eyebrow"><span />Une maison, trois façons de se retrouver<span /></p>
            <h1 id="hero-heading">Loin du bruit,<br /><em>près de l’essentiel.</em></h1>
            <p className="hero-subtitle">Suites de caractère, spa confidentiel & événements singuliers.{' '}<br />Au cœur du vignoble de Saint-Émilion, une autre idée du temps.</p>
            <a href="#univers" className="hero-discover">Entrez dans la maison <ArrowDown size={15} strokeWidth={1.5} /></a>
          </motion.div>
          <div className="hero-bottom">
            <span className="hero-location"><MapPin size={14} strokeWidth={1.25} />Lussac · Saint-Émilion · France</span>
            <a href="#univers" className="scroll-cue" aria-label="Découvrir les trois univers"><span>Prendre le temps</span><span className="scroll-line" /></a>
            <div className="heritage-mark"><ChateauSketch /><span>Une demeure historique<br /><span>Un art de vivre</span></span></div>
          </div>
        </section>

        <section className="universes-section section-space" id="univers" aria-labelledby="universes-heading">
          <div className="page-width">
            <Reveal className="section-heading triptych-heading">
              <div><p className="eyebrow">L’esprit Latour Ségur</p><h2 id="universes-heading">Une maison.<br className="mobile-break" /> <em>Trois parenthèses.</em></h2></div>
              <p className="section-intro">Séjourner. Se ressourcer. Se réunir.{' '}<br />Trois portes ouvertes sur l’essentiel.</p>
            </Reveal>
            <div className="triptych">
              {universes.map((universe, index) => <Reveal key={universe.id} delay={index * 0.1} className="triptych-reveal"><a href={`#${universe.id}`} className={`universe-card universe-${universe.id}`}>
                <Picture name={universe.image} alt={universe.imageAlt} sizes="(max-width: 700px) 100vw, 33vw" />
                <div className="universe-shade" />
                <div className="universe-top"><span>{universe.number}</span><span>{universe.art}</span></div>
                <div className="universe-bottom"><h3>{universe.title[0]}<br /><em>{universe.title[1]}</em></h3><p>{universe.tagline}</p><span className="universe-link">Découvrir cet univers <span className="arrow-circle"><ArrowUpRight size={21} strokeWidth={1.2} /></span></span></div>
              </a></Reveal>)}
            </div>
            <Reveal className="triptych-footnote"><span />Un même lieu. Une même attention. Infiniment de possibles.<span /></Reveal>
          </div>
        </section>

        <section className="domain-section section-space" id="domaine" aria-labelledby="domain-heading">
          <div className="domain-grid page-width">
            <Reveal className="domain-visual"><div className="domain-main-photo"><Picture name="parc" alt="L’allée de cyprès du parc du château, une invitation à la promenade" /></div><div className="domain-small-photo"><Picture name="chateau-panorama" alt="Les vieilles pierres et les dépendances du domaine" /><span>Le charme des choses qui durent.</span></div><span className="vertical-caption">Une histoire de lieu, une histoire de liens</span></Reveal>
            <Reveal className="domain-copy" delay={0.12}>
              <p className="eyebrow">Le domaine · Lussac, Saint-Émilion</p>
              <h2 id="domain-heading">Des pierres, une histoire.<br /><em>Et surtout, une âme.</em></h2>
              <p>Il y a des maisons que l’on visite.<br />Et d’autres que l’on a l’impression de retrouver.</p>
              <p>Aux portes de Saint-Émilion, le Château Latour Ségur se dévoile entre arbres centenaires, étangs et vieilles pierres. Une demeure historique vivante, où l’élégance se fait discrète et l’accueil, profondément personnel.</p>
              <blockquote>« Notre bonheur, c’est que vous vous sentiez ici un peu chez vous. »</blockquote>
              <div className="host-signature"><span>Corinne & André</span><span className="eyebrow">Vos hôtes, tout simplement</span></div>
              <button className="text-link" onClick={() => setModal({ type: 'story' })}>L’histoire de notre maison <ArrowUpRight size={18} strokeWidth={1.2} /></button>
            </Reveal>
          </div>
          <Reveal className="domain-values page-width"><div><ChateauSketch /><span>Une demeure<br /><em>historique</em></span></div><span className="value-separator" /><p>Le privilège du calme.<br /><em>Le luxe d’être attendu.</em></p><span className="value-separator" /><div className="domain-address"><MapPin size={25} strokeWidth={0.8} /><span>Au cœur du vignoble<br /><em>de Saint-Émilion</em></span></div></Reveal>
        </section>

        <div className="chapters">{universes.map((universe) => <Chapter key={universe.id} universe={universe} onDiscover={() => setModal({ type: 'universe', id: universe.id })} />)}</div>

        <section className="escapes-section section-space" id="echappees" aria-labelledby="escapes-heading"><div className="page-width">
          <Reveal className="section-heading"><div><p className="eyebrow">Week-ends & cures</p><h2 id="escapes-heading">S’accorder <em>un peu plus.</em></h2></div><p className="section-intro">Quelques heures ou quelques jours.{' '}<br />Juste le temps qu’il vous faut.</p></Reveal>
          <div className="escape-grid">{escapes.map((escape, index) => <Reveal key={escape.id} delay={index * 0.1}><button className="escape-card" onClick={() => setModal({ type: 'escape', id: escape.id })}><div className="escape-image"><Picture name={escape.image} alt={escape.alt} sizes="(max-width: 700px) 100vw, 33vw" /><span className="escape-image-arrow"><ArrowUpRight size={20} strokeWidth={1.25} /></span></div><div className="escape-card-content"><p className="eyebrow">{escape.label}</p><h3>{escape.title}</h3><p>{escape.text}</p><span className="text-link">Composer ma parenthèse <ArrowRight size={16} strokeWidth={1.25} /></span></div></button></Reveal>)}</div>
          <Reveal className="gift-note"><span>Les plus beaux cadeaux ne se gardent pas. <em>Ils se vivent.</em></span><button className="text-link" onClick={() => book(undefined, 'Je souhaite offrir une expérience au Château Latour Ségur. Merci de me présenter les possibilités de bon cadeau.')}>Offrir un moment <ArrowUpRight size={17} strokeWidth={1.25} /></button></Reveal>
        </div></section>

        <section className="interlude" aria-label="L’esprit de la maison"><Picture name="chateau-panorama" alt="Les murs de pierre et les arbres du domaine, baignés de lumière" sizes="100vw" /><div className="interlude-shade" /><Reveal className="interlude-content"><p className="eyebrow">Laisser le temps au temps</p><p className="interlude-quote">Ici, le plus beau programme,{' '}<br />c’est de <em>n’en avoir aucun.</em></p><span className="interlude-line" /></Reveal></section>

        <section className="gallery-section section-space" id="galerie" aria-labelledby="gallery-heading"><div className="page-width">
          <Reveal className="gallery-heading"><p className="eyebrow">Fragments de douceur</p><h2 id="gallery-heading">L’esprit du lieu, <em>en images.</em></h2><p>Une lumière, une matière, un instant. L’envie d’y être, déjà.</p></Reveal>
          <div className="gallery-filters" aria-label="Filtrer les photographies">{([{ id: 'tous', label: 'Tous les instants' }, { id: 'suites', label: 'Les suites' }, { id: 'spa', label: 'Le spa' }, { id: 'evenements', label: 'Les événements' }] as { id: GalleryFilter; label: string }[]).map((item) => <button key={item.id} className={filter === item.id ? 'is-active' : ''} onClick={() => setFilter(item.id)} aria-pressed={filter === item.id}>{item.label}{filter === item.id && <motion.span className="filter-underline" layoutId="gallery-filter" transition={{ duration: 0.4 }} />}</button>)}</div>
          <motion.div layout className={`gallery-grid ${filter !== 'tous' ? 'is-filtered' : ''}`}><AnimatePresence mode="popLayout">{visiblePhotos.map((photo, index) => <motion.button layout key={photo.id} className="gallery-photo" onClick={() => setLightbox(index)} aria-label={`Agrandir : ${photo.title}`} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}><Picture name={photo.image} alt={photo.alt} sizes="(max-width: 640px) 50vw, 33vw" /><span className="gallery-photo-overlay" /><span className="gallery-photo-title">{photo.title}</span><span className="gallery-plus"><Plus size={19} strokeWidth={1.2} /></span></motion.button>)}</AnimatePresence></motion.div>
          <p className="gallery-note">Photographies du domaine et images d’inspiration.</p>
        </div></section>

        <section className="closing-section" id="contact" aria-labelledby="closing-heading"><ChateauSketch className="closing-sketch" /><Reveal className="closing-content"><p className="eyebrow">Le plaisir de vous accueillir</p><h2 id="closing-heading">Et si l’on prenait<br /><em>le temps de se rencontrer ?</em></h2><p>Un séjour, une pause, une belle occasion.<br />Chaque histoire commence par une conversation.</p><div className="closing-choices">{universes.map((universe) => <button key={universe.id} onClick={() => book(universe.id)}>{universe.id === 'suites' ? 'Séjourner' : universe.id === 'spa' ? 'Se ressourcer' : 'Se réunir'}<ArrowUpRight size={17} strokeWidth={1.25} /></button>)}</div><span className="closing-signature">Corinne & André</span></Reveal></section>
      </main>

      <footer className="site-footer"><div className="footer-main page-width">
        <div className="footer-brand"><a href="#accueil" aria-label="Retour en haut"><Brand sketch /></a><p>Une maison, trois parenthèses.<br />Le bonheur d’être simplement là.</p></div>
        <div className="footer-column"><h3>La maison</h3><a href="#domaine">Le domaine</a><a href="#suites">Les suites</a><a href="#spa">Le Spa TerreHappy®</a><a href="#evenements">Séminaires & événements</a></div>
        <div className="footer-column"><h3>Vos instants</h3><a href="#echappees">Week-ends & cures</a><button onClick={() => book(undefined, 'Je souhaite offrir un bon cadeau. Pourriez-vous me renseigner ?')}>Offrir une parenthèse</button><a href="#galerie">La galerie</a><button onClick={() => book()}>Préparer votre venue</button></div>
        <div className="footer-column footer-contact"><h3>Retrouvons-nous</h3><address>{contact.address}<br />{contact.locality}</address><a href={`tel:${contact.phoneLink}`}>{contact.phone}</a><a className="footer-email" href={`mailto:${contact.email}`}>{contact.email}</a><a href={contact.map} target="_blank" rel="noopener noreferrer" className="footer-map">Itinéraire <ArrowUpRight size={14} /></a></div>
      </div><div className="footer-bottom page-width"><p>© {new Date().getFullYear()} Château Latour Ségur</p><div><button onClick={() => setModal({ type: 'legal' })}>Mentions légales</button><button onClick={() => setModal({ type: 'privacy' })}>Confidentialité</button></div><a className="instagram-link" href="https://www.instagram.com/chateaulatoursegur/" target="_blank" rel="noopener noreferrer" aria-label="Le Château Latour Ségur sur Instagram"><Instagram size={17} strokeWidth={1.2} /><span>Au fil des jours</span><ArrowUpRight size={13} /></a></div></footer>

      {menuOpen && <Modal title="Menu de navigation" onClose={() => setMenuOpen(false)} className="mobile-menu"><Brand sketch /><p className="eyebrow">Bienvenue à la maison</p><nav aria-label="Navigation mobile">{[{ id: 'domaine', text: 'Le domaine' }, { id: 'suites', text: 'Les suites' }, { id: 'spa', text: 'Le Spa TerreHappy®' }, { id: 'evenements', text: 'Séminaires & événements' }, { id: 'echappees', text: 'Week-ends & cures' }, { id: 'galerie', text: 'La galerie' }].map((link, index) => <button key={link.id} onClick={() => navigateFromMenu(link.id)}><span>0{index + 1}</span>{link.text}<ArrowUpRight size={18} strokeWidth={1.2} /></button>)}</nav><button className="button button-burgundy" onClick={() => book()}>Préparer ma venue <ArrowUpRight size={17} /></button><a className="mobile-menu-phone" href={`tel:${contact.phoneLink}`}>{contact.phone}</a></Modal>}

      {modal && <Modal key={modal.type} title={modal.type === 'booking' ? 'Préparer votre venue au château' : modal.type === 'legal' ? 'Mentions légales' : modal.type === 'privacy' ? 'Confidentialité' : 'Découvrir le Château Latour Ségur'} onClose={() => setModal(null)} className={`content-modal ${modal.type === 'booking' ? 'booking-modal' : ''}`}>
        {modal.type === 'booking' && <BookingForm initialUniverse={modal.universe} initialMessage={modal.message} />}
        {modal.type === 'universe' && (() => { const universe = universes.find((item) => item.id === modal.id)!; return <><div className="detail-image"><Picture name={universe.image} alt={universe.imageAlt} /></div><div className="detail-body"><p className="eyebrow">{universe.art}</p><h2>{universe.title[0]}<br /><em>{universe.title[1]}</em></h2><p>{universe.description}</p><div className="detail-options">{universe.options.map((option, index) => <details key={option.title} open={index === 0}><summary>{option.title}<ChevronDown size={18} strokeWidth={1.25} /></summary><p>{option.text}</p></details>)}</div><p className="detail-note">Chaque parenthèse se prépare ensemble. Disponibilités, prestations et tarifs sur demande.</p><button className="button button-burgundy" onClick={() => book(universe.id)}>Parlons de vos envies <ArrowRight size={17} /></button></div></> })()}
        {modal.type === 'escape' && (() => { const escape = escapes.find((item) => item.id === modal.id)!; return <><div className="detail-image"><Picture name={escape.image} alt={escape.alt} /></div><div className="detail-body"><p className="eyebrow">{escape.label}</p><h2>{escape.title}</h2><p>{escape.text}</p><p>Votre parenthèse ne ressemble qu’à vous. Partagez vos dates, le nombre de personnes et vos envies avec Corinne et André : nous composerons ensemble une proposition adaptée.</p><p className="detail-note">Formules, prestations et tarifs à confirmer directement avec le château.</p><button className="button button-burgundy" onClick={() => book(escape.universe, escape.request)}>Composer ma parenthèse <ArrowRight size={17} /></button></div></> })()}
        {modal.type === 'story' && <><div className="detail-image"><Picture name="domaine" alt="La façade historique du Château Latour Ségur" /></div><div className="detail-body"><p className="eyebrow">Une maison, une histoire</p><h2>Le goût des lieux.<br /><em>Le sens de l’accueil.</em></h2><p>Amoureux des belles bâtisses et des rencontres, Corinne Dray et André Nizet ont fait du Château Latour Ségur une maison ouverte aux voyageurs, aux épicuriens et à tous ceux qui aspirent à ralentir.</p><p>Dans son parc ombragé ponctué d’étangs, au cœur du vignoble de Lussac Saint-Émilion, cette demeure historique cultive un art de vivre simple et attentionné. Ses dépendances abritent les suites ; le Spa TerreHappy® invite au bien-être ; les espaces du domaine font place aux rencontres et aux événements.</p><p>Une même philosophie relie ces trois univers : vous accueillir personnellement et vous laisser repartir avec un peu de la douceur du lieu.</p><span className="story-signature">À très bientôt, Corinne & André</span><button className="button button-burgundy" onClick={() => book()}>Faisons connaissance <ArrowRight size={17} /></button></div></>}
        {modal.type === 'legal' && <div className="detail-body legal-content"><p className="eyebrow">Informations</p><h2>Mentions <em>légales.</em></h2><h3>Le domaine</h3><p>Château Latour Ségur<br />{contact.address}, {contact.locality}<br />{contact.phone}<br /><a href={`mailto:${contact.email}`}>{contact.email}</a></p><h3>À propos de cette page</h3><p>Cette page est une proposition de refonte du site du Château Latour Ségur. Elle présente l’esprit du domaine et ses trois univers. Les prestations, disponibilités et tarifs doivent être confirmés directement auprès du château.</p><h3>Photographies</h3><p>Photographies du domaine : Château Latour Ségur. Photographies d’inspiration : Unsplash. Les images d’inspiration illustrent une atmosphère et ne sont pas contractuelles.</p><h3>Demandes de renseignements</h3><p>Le formulaire prépare un message à envoyer depuis votre messagerie personnelle. Il n’effectue aucune réservation et ne collecte aucun paiement.</p></div>}
        {modal.type === 'privacy' && <div className="detail-body legal-content"><p className="eyebrow">Vos données</p><h2>En toute <em>confiance.</em></h2><h3>Un formulaire transparent</h3><p>Les informations saisies restent dans votre navigateur le temps de préparer votre demande. Elles ne sont ni enregistrées dans une base de données ni envoyées automatiquement.</p><p>Si vous choisissez « Envoyer par e-mail », votre messagerie s’ouvre avec le texte préparé. Vous restez libre de le modifier et de l’envoyer au château.</p><h3>Navigation et cookies</h3><p>Cette page n’installe aucun cookie publicitaire. Les polices et photographies sont hébergées avec le site. Les liens vers Instagram et Google Maps vous conduisent vers des services externes, soumis à leurs propres politiques.</p><h3>Nous contacter</h3><p>Pour toute question concernant un échange avec le domaine : <a href={`mailto:${contact.email}`}>{contact.email}</a>.</p></div>}
      </Modal>}

      {lightboxPhoto && lightbox !== null && <Modal title={`Photographie : ${lightboxPhoto.title}`} onClose={() => setLightbox(null)} className="lightbox"><div className="lightbox-image"><AnimatePresence mode="wait"><motion.img key={lightboxPhoto.id} src={`/images/${lightboxPhoto.image}.webp`} alt={lightboxPhoto.alt} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }} /></AnimatePresence></div><div className="lightbox-bottom"><div><p>{lightboxPhoto.title}</p><span>{String(lightbox + 1).padStart(2, '0')} / {String(visiblePhotos.length).padStart(2, '0')}</span></div><div className="lightbox-controls"><button className="icon-button" aria-label="Photographie précédente" onClick={() => setLightbox((lightbox - 1 + visiblePhotos.length) % visiblePhotos.length)}><ArrowLeft size={22} strokeWidth={1.25} /></button><button className="icon-button" aria-label="Photographie suivante" onClick={() => setLightbox((lightbox + 1) % visiblePhotos.length)}><ArrowRight size={22} strokeWidth={1.25} /></button></div></div></Modal>}
    </MotionConfig>
  )
}

export default App
