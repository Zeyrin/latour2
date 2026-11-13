import { useEffect, useState, type ReactNode } from 'react'
import { ArrowRight, Check, Phone } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Brand } from '../components/Brand'
import { Seo } from '../components/Seo'
import { contact, suites } from '../lib/content'
import { LangContext, locales, paths, type Lang, type PageKey } from '../lib/i18n'
import { formatEuros } from '../lib/pricing'
import { bookingUi, payUi } from '../lib/ui'

interface BookingView {
  status: 'pending' | 'paid' | 'expired' | 'cancelled' | 'refunded' | 'conflict'
  suite: string
  arrival: string
  departure: string
  nights: number
  guests: number
  amount_total: number
}

type State = { phase: 'loading' } | { phase: 'done'; booking: BookingView } | { phase: 'error' }

const POLL_DELAYS = [0, 1500, 2500, 4000, 6000, 8000]

function longDate(iso: string, lang: Lang) {
  return new Intl.DateTimeFormat(locales[lang], { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(`${iso}T12:00:00Z`))
}

function Layout({ lang, page, title, children }: { lang: Lang; page: PageKey; title: string; children: ReactNode }) {
  return (
    <LangContext.Provider value={lang}>
      <div className="booking-return legal-page">
        <Seo lang={lang} page={page} title={`${title} — Château Latour Ségur Suites & Spa`} description={title} noindex />
        <header><Link to={paths.home[lang]} aria-label="Château Latour Ségur Suites & Spa"><Brand /></Link></header>
        <main><div className="booking-confirmation" role="status">{children}</div></main>
      </div>
    </LangContext.Provider>
  )
}

function Summary({ booking, lang }: { booking: BookingView; lang: Lang }) {
  const p = payUi[lang]
  const t = bookingUi[lang]
  const suite = suites[lang].find((item) => item.id === booking.suite)?.label ?? booking.suite
  return <dl className="price-summary" aria-label={p.summary}>
    <div><dt>{suite}</dt><dd>{t.guestsLine}{lang === 'fr' ? ' : ' : ': '}{booking.guests}</dd></div>
    <div><dt>{longDate(booking.arrival, lang)} → {longDate(booking.departure, lang)}</dt><dd>{t.nightsCount(booking.nights)}</dd></div>
    <div className="price-total"><dt>{booking.status === 'paid' || booking.status === 'conflict' ? p.paid : p.total}</dt><dd>{formatEuros(booking.amount_total, locales[lang])}</dd></div>
  </dl>
}

function CallUs({ lang }: { lang: Lang }) {
  return <a className="booking-phone" href={`tel:${contact.phoneLink}`}><Phone size={15} strokeWidth={1.25} /> {payUi[lang].call} <span>{contact.phone}</span></a>
}

/** Page d'arrivée après un paiement Stripe réussi : vérifie la réservation (le webhook peut arriver après le client). */
function Confirmed({ lang }: { lang: Lang }) {
  const p = payUi[lang]
  const [state, setState] = useState<State>({ phase: 'loading' })

  useEffect(() => {
    const sessionId = new URLSearchParams(window.location.search).get('session_id')
    let active = true
    let timer = 0
    const check = async (attempt: number) => {
      if (!sessionId) return setState({ phase: 'error' })
      try {
        const response = await fetch(`/api/booking-status?session_id=${encodeURIComponent(sessionId)}`)
        if (!active) return
        if (response.status === 404 || response.status === 400) return setState({ phase: 'error' })
        if (response.ok) {
          const booking = await response.json() as BookingView
          if (booking.status !== 'pending' || attempt >= POLL_DELAYS.length - 1) return setState({ phase: 'done', booking })
        } else if (attempt >= POLL_DELAYS.length - 1) return setState({ phase: 'error' })
      } catch {
        if (attempt >= POLL_DELAYS.length - 1) return setState({ phase: 'error' })
      }
      if (active) timer = window.setTimeout(() => void check(attempt + 1), POLL_DELAYS[attempt + 1])
    }
    void check(0)
    return () => { active = false; window.clearTimeout(timer) }
  }, [])

  const booking = state.phase === 'done' ? state.booking : null
  const paid = booking?.status === 'paid'
  // Une fois la vérification terminée, chaque cas a son propre titre (rien n'affiche « confirmée » à tort).
  const [eyebrow, title, text] = state.phase === 'error' ? [p.failedEyebrow, p.failedTitle, p.failedText]
    : !booking ? [p.checkingEyebrow, p.checkingTitle, p.checkingText]
      : paid ? [p.confirmedEyebrow, p.confirmedTitle, p.confirmedText]
        : booking.status === 'conflict' ? [p.conflictEyebrow, p.conflictTitle, p.conflictText]
          : [p.pendingEyebrow, p.pendingTitle, p.pendingText]
  return (
    <Layout lang={lang} page="bookingConfirmed" title={eyebrow}>
      {paid && <span className="confirmation-icon"><Check size={28} strokeWidth={1.2} /></span>}
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title[0]}<br /><em>{title[1]}</em></h1>
      <p>{text}</p>
      {booking && <Summary booking={booking} lang={lang} />}
      {paid && <p className="form-note booking-cancellation">{p.cancellation}</p>}
      <Link className="button button-burgundy" to={paths.home[lang]}>{p.back} <ArrowRight size={17} /></Link>
      <CallUs lang={lang} />
    </Layout>
  )
}

/** Page d'arrivée quand le client quitte la page de paiement Stripe : libère ses dates tout de suite. */
function Cancelled({ lang }: { lang: Lang }) {
  const p = payUi[lang]
  const [booking, setBooking] = useState<BookingView | null>(null)

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('booking')
    if (!id) return
    let active = true
    fetch('/api/booking-status', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ booking: id }) })
      .then((response) => response.ok ? response.json() as Promise<BookingView> : null)
      .then((result) => { if (active && result) setBooking(result) })
      .catch(() => { /* les dates seront libérées à l'expiration du paiement */ })
    return () => { active = false }
  }, [])

  // Le paiement a abouti dans un autre onglet : on l'affiche plutôt que « rien n'a été débité ».
  if (booking?.status === 'paid') return (
    <Layout lang={lang} page="bookingCancelled" title={p.confirmedEyebrow}>
      <span className="confirmation-icon"><Check size={28} strokeWidth={1.2} /></span>
      <p className="eyebrow">{p.confirmedEyebrow}</p>
      <h1>{p.confirmedTitle[0]}<br /><em>{p.confirmedTitle[1]}</em></h1>
      <p>{p.confirmedText}</p>
      <Summary booking={booking} lang={lang} />
      <Link className="button button-burgundy" to={paths.home[lang]}>{p.back} <ArrowRight size={17} /></Link>
    </Layout>
  )

  if (booking?.status === 'conflict') return (
    <Layout lang={lang} page="bookingCancelled" title={p.conflictEyebrow}>
      <p className="eyebrow">{p.conflictEyebrow}</p>
      <h1>{p.conflictTitle[0]}<br /><em>{p.conflictTitle[1]}</em></h1>
      <p>{p.conflictText}</p>
      <Summary booking={booking} lang={lang} />
      <CallUs lang={lang} />
    </Layout>
  )

  return (
    <Layout lang={lang} page="bookingCancelled" title={p.cancelledEyebrow}>
      <p className="eyebrow">{p.cancelledEyebrow}</p>
      <h1>{p.cancelledTitle[0]}<br /><em>{p.cancelledTitle[1]}</em></h1>
      <p>{p.cancelledText}</p>
      <Link className="button button-burgundy" to={`${paths.home[lang]}?reserver`}>{p.rebook} <ArrowRight size={17} /></Link>
      <Link className="text-link" to={paths.home[lang]}>{p.back} <ArrowRight size={16} /></Link>
      <CallUs lang={lang} />
    </Layout>
  )
}

export const BookingConfirmedFr = () => <Confirmed lang="fr" />
export const BookingConfirmedEn = () => <Confirmed lang="en" />
export const BookingCancelledFr = () => <Cancelled lang="fr" />
export const BookingCancelledEn = () => <Cancelled lang="en" />
