import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ArrowLeft, ArrowRight, ArrowUpRight, Check, Globe, Phone } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Brand } from '../components/Brand'
import { Picture } from '../components/Picture'
import { Seo } from '../components/Seo'
import { GIFT_URL, SITE_URL, contact } from '../lib/content'
import { EVENT_OPTIONS, EVENT_TYPES, eventsPaths, eventsText, type EventType } from '../lib/events'
import { guidesIndexPaths } from '../lib/guides'
import { LangContext, paths, type Lang } from '../lib/i18n'
import { parisToday } from '../lib/pricing'
import { ui } from '../lib/ui'
import '../events.css'

const FORM_ID = 'devis'

function scrollToForm() {
  document.getElementById(FORM_ID)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function QuoteForm({ lang }: { lang: Lang }) {
  const t = eventsText[lang]
  const [type, setType] = useState<EventType>('seminaire')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [options, setOptions] = useState<string[]>([])
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [error, setError] = useState('')
  const sentRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => { if (status === 'sent') sentRef.current?.focus() }, [status])

  const endError = start && end && end <= start ? t.endBeforeStart : ''
  // Calculé seulement après une saisie (la page est pré-rendue : pas de date du jour figée au moment du build).
  const startError = start && start < parisToday() ? t.pastDate : ''

  function toggle(option: string) {
    setOptions((current) => current.includes(option) ? current.filter((item) => item !== option) : [...current, option])
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (endError || startError) return
    const values = new FormData(event.currentTarget)
    const field = (name: string) => String(values.get(name) || '').trim()
    setStatus('sending')
    setError('')
    try {
      const response = await fetch('/api/quote-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          start: start || null,
          end: end || null,
          flexible: values.get('flexible') === 'on',
          participants: Number(field('participants')) || null,
          options,
          organisation: field('organisation'),
          name: [field('given-name'), field('family-name')].filter(Boolean).join(' '),
          email: field('email'),
          phone: field('phone'),
          message: field('message'),
          lang,
          website: field('website'),
        }),
      })
      if (!response.ok) throw new Error(String(response.status))
      setStatus('sent')
    } catch (cause) {
      setStatus('idle')
      setError(cause instanceof Error && cause.message === '429' ? t.tooMany : 'error')
    }
  }

  if (status === 'sent') {
    return (
      <div className="quote-sent">
        <span className="confirmation-icon"><Check size={24} strokeWidth={1.25} /></span>
        <h3 ref={sentRef} tabIndex={-1}>{t.sentTitle}</h3>
        <p>{t.sentText}</p>
        <button className="text-link" onClick={() => { setStatus('idle'); setOptions([]); setStart(''); setEnd('') }}>{t.sentAgain} <ArrowRight size={15} /></button>
      </div>
    )
  }

  return (
    <form className="quote-form" onSubmit={submit} noValidate={false}>
      <fieldset className="quote-types">
        <legend>{t.type}</legend>
        <div>
          {EVENT_TYPES.map((id) => <label key={id} className={`suite-choice ${type === id ? 'is-selected' : ''}`}>
            <input type="radio" name="type" value={id} checked={type === id} onChange={() => setType(id)} />
            {t.types[id]}
          </label>)}
        </div>
      </fieldset>
      <div className="form-grid">
        <label className="form-field"><span>{t.start}</span><input type="date" name="start" value={start} onChange={(event) => setStart(event.target.value)} aria-describedby={startError ? 'quote-start-error' : undefined} />{startError && <small id="quote-start-error" className="dates-error">{startError}</small>}</label>
        <label className="form-field"><span>{t.end}</span><input type="date" name="end" min={start || undefined} value={end} onChange={(event) => setEnd(event.target.value)} aria-describedby={endError ? 'quote-end-error' : undefined} />{endError && <small id="quote-end-error" className="dates-error">{endError}</small>}</label>
        <label className="consent quote-flexible form-field-wide"><input type="checkbox" name="flexible" /><span>{t.flexible}</span></label>
        <label className="form-field"><span>{t.participants} <span aria-hidden="true">*</span></span><input name="participants" type="number" inputMode="numeric" min="1" max="500" step="1" required placeholder={t.participantsPlaceholder} autoComplete="off" data-1p-ignore data-lpignore="true" /></label>
        <label className="form-field"><span>{t.organisation}</span><input name="organisation" autoComplete="organization" maxLength={120} placeholder={t.organisationPlaceholder} /></label>
      </div>
      <fieldset className="quote-options">
        <legend>{t.options}</legend>
        {EVENT_OPTIONS.map((id) => <label key={id} className={`quote-option ${options.includes(id) ? 'is-selected' : ''}`}>
          <input type="checkbox" checked={options.includes(id)} onChange={() => toggle(id)} />
          <span className="booking-option-check" aria-hidden="true"><Check size={14} /></span>
          <span><strong>{t.optionLabels[id][0]}</strong><small>{t.optionLabels[id][1]}</small></span>
        </label>)}
      </fieldset>
      <div className="form-grid">
        <label className="form-field"><span>{t.firstName} <span aria-hidden="true">*</span></span><input name="given-name" autoComplete="given-name" required maxLength={50} /></label>
        <label className="form-field"><span>{t.lastName} <span aria-hidden="true">*</span></span><input name="family-name" autoComplete="family-name" required maxLength={50} /></label>
        <label className="form-field"><span>{t.email} <span aria-hidden="true">*</span></span><input name="email" type="email" autoComplete="email" required maxLength={200} /></label>
        <label className="form-field"><span>{t.phone}</span><input name="phone" type="tel" autoComplete="tel" maxLength={40} /></label>
        <label className="form-field form-field-wide"><span>{t.message}</span><textarea name="message" rows={4} maxLength={1500} placeholder={t.messagePlaceholder} /></label>
      </div>
      {/* Champ piège invisible pour les robots (voir api/quote-request.ts). */}
      <label className="quote-trap" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
      <label className="consent"><input type="checkbox" name="consent" required /><span>{t.consent} <span aria-hidden="true">*</span></span></label>
      <div role="status" className="form-status pay-error">{error === 'error' ? <>{t.error} <a href={`mailto:${contact.email}`}>{contact.email}</a>.</> : error}</div>
      <button className="button button-burgundy form-submit" type="submit" disabled={status === 'sending'} aria-busy={status === 'sending' || undefined}>{status === 'sending' ? t.sending : t.submit} <ArrowRight size={17} /></button>
      <p className="form-note">{t.note}</p>
    </form>
  )
}

/** Page « Séminaires & événements » avec demande de devis. */
export function EventsPage({ lang = 'fr' }: { lang?: Lang }) {
  const t = eventsText[lang]
  const u = ui[lang]
  const other: Lang = lang === 'fr' ? 'en' : 'fr'
  const url = `${SITE_URL}${eventsPaths[lang]}`
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${url}#page`,
    url,
    name: t.seoTitle,
    description: t.seoDescription,
    inLanguage: lang,
    isPartOf: { '@id': `${SITE_URL}/#website` },
    about: { '@id': `${SITE_URL}/#etablissement` },
    primaryImageOfPage: `${SITE_URL}/images/cuvier.webp`,
  }

  useEffect(() => {
    if (window.location.hash === `#${FORM_ID}`) window.setTimeout(scrollToForm, 50)
  }, [])

  return (
    <LangContext.Provider value={lang}>
      <div className="suite-page events-page">
        <Seo lang={lang} page={eventsPaths} title={t.seoTitle} description={t.seoDescription} image={`${SITE_URL}/images/cuvier.webp`}><script type="application/ld+json">{JSON.stringify(jsonLd)}</script></Seo>
        <header className="suite-header">
          <Link to={paths.home[lang]} className="suite-header-brand" aria-label={u.homeLabel}><Brand /></Link>
          <Link to={paths.home[lang]} className="suite-back"><ArrowLeft size={15} strokeWidth={1.25} />{t.home}</Link>
          <div className="suite-header-actions">
            <Link to={eventsPaths[other]} className="lang-switch" hrefLang={other} lang={other} aria-label={u.switchLang}><Globe size={14} strokeWidth={1.25} />{u.switchLabel}</Link>
            <a className="button header-cta" href={`#${FORM_ID}`}>{t.cta} <ArrowUpRight size={15} strokeWidth={1.5} /></a>
          </div>
        </header>
        <main>
          <header className="events-hero page-width">
            <nav className="suite-breadcrumb" aria-label={u.breadcrumbLabel}><ol><li><Link to={paths.home[lang]}>{t.home}</Link></li><li aria-current="page">{t.eyebrow}</li></ol></nav>
            <h1>{t.title[0]} <em>{t.title[1]}</em></h1>
            <div className="events-hero-bottom">
              <p className="events-lead">{t.lead}</p>
              <a className="button button-burgundy" href={`#${FORM_ID}`}>{t.cta} <ArrowRight size={17} /></a>
            </div>
          </header>
          <figure className="events-cover"><Picture name="domaine-facade" alt={t.coverAlt} priority sizes="100vw" /></figure>
          <ul className="events-facts page-width" aria-label={t.eyebrow}>{t.facts.map((fact) => <li key={fact}>{fact}</li>)}</ul>

          <section className="events-section page-width" aria-labelledby="events-formats">
            <p className="eyebrow">{t.formatsEyebrow}</p>
            <h2 id="events-formats">{t.formatsTitle[0]} <em>{t.formatsTitle[1]}</em></h2>
            <ul className="events-formats">
              {t.formats.map((format) => <li key={format.id}>
                <span className="events-photo"><Picture name={format.image} alt={format.alt} sizes="(max-width: 700px) 100vw, 33vw" /></span>
                <h3>{format.title}</h3>
                <p>{format.text}</p>
              </li>)}
            </ul>
          </section>

          <section className="events-places" aria-labelledby="events-places">
            <div className="page-width">
              <p className="eyebrow">{t.placesEyebrow}</p>
              <h2 id="events-places">{t.placesTitle[0]} <em>{t.placesTitle[1]}</em></h2>
              <ul className="events-places-grid">
                {t.places.map((place, index) => <li key={place.image} className={index === 0 ? 'is-wide' : ''}>
                  <span className="events-photo"><Picture name={place.image} alt={place.alt} sizes={index === 0 ? '(max-width: 700px) 100vw, 66vw' : '(max-width: 700px) 100vw, 33vw'} /></span>
                  <h3>{place.title}</h3>
                  <p>{place.text}</p>
                </li>)}
              </ul>
            </div>
          </section>

          <section className="events-section events-steps-section page-width" aria-labelledby="events-steps">
            <h2 id="events-steps" className="eyebrow">{t.stepsEyebrow}</h2>
            <ol className="events-steps">{t.steps.map((step, index) => <li key={step.title}><span>0{index + 1}</span><h3>{step.title}</h3><p>{step.text}</p></li>)}</ol>
          </section>

          <section className="events-quote" id={FORM_ID} aria-labelledby="events-quote-title">
            <div className="page-width events-quote-inner">
              <div className="events-quote-copy">
                <p className="eyebrow">{t.formEyebrow}</p>
                <h2 id="events-quote-title">{t.formTitle[0]} <em>{t.formTitle[1]}</em></h2>
                <p>{t.formIntro}</p>
                <figure className="events-quote-photo"><Picture name="domaine-allee-arbres" alt="" sizes="(max-width: 1000px) 0px, 40vw" /></figure>
                <p className="events-quote-phone">{t.formPhone}<a href={`tel:${contact.phoneLink}`}><Phone size={15} strokeWidth={1.25} />{contact.phone}</a></p>
                <span className="closing-signature">Corinne & André</span>
              </div>
              <QuoteForm lang={lang} />
            </div>
          </section>
        </main>
        <aside className="suite-mobile-bar" aria-label={t.cta}><span><strong>{t.mobileBar[0]}</strong>{t.mobileBar[1]}</span><a className="button button-burgundy" href={`#${FORM_ID}`}>{t.cta}</a></aside>
        <footer className="suite-footer">
          <div className="page-width">
            <Link to={paths.home[lang]} aria-label={u.homeLabel}><Brand /></Link>
            <address>{contact.address}, {contact.locality}<br /><a href={`tel:${contact.phoneLink}`}>{contact.phone}</a> · <a href={`mailto:${contact.email}`}>{contact.email}</a></address>
            <div className="suite-footer-links"><Link to={paths.home[lang]}>{u.homeKeywordLink}</Link><Link to={guidesIndexPaths[lang]}>{u.guidesLink}</Link><a href={GIFT_URL} target="_blank" rel="noopener" aria-label={`${u.footerGift} ${u.newWindow}`}>{u.footerGift}</a><Link to={paths.legal[lang]}>{u.legal}</Link></div>
          </div>
        </footer>
      </div>
    </LangContext.Provider>
  )
}
