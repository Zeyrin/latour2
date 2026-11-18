import { useEffect, useState, type FormEvent } from 'react'
import { ArrowRight, Check } from 'lucide-react'
import { Link } from 'react-router-dom'
import { AvailabilityCalendar } from '../components/AvailabilityCalendar'
import { addDays, freeResource, type AvailabilityBlock } from '../lib/availability'
import { suites } from '../lib/content'
import { locales, paths, type Lang } from '../lib/i18n'
import { MIN_DAYS_BEFORE_ARRIVAL, RATES, formatEuros, isPricedSuite, parisToday, quote } from '../lib/pricing'
import { bookingUi, manageUi, payUi } from '../lib/ui'
import { CallUs, Layout, Summary, type BookingView } from './BookingReturn'

/** Réservation telle que la renvoie api/manage-booking (aucune coordonnée du client). */
interface ManagedBooking extends BookingView {
  amount_refunded: number
  cancelled: boolean
  deadline: string | null
  can_manage: boolean
}

type Phase = 'loading' | 'not_found' | 'ready'
type Mode = 'view' | 'cancel' | 'change'
type Notice = 'changed' | 'refused' | 'cancelled' | null

const referrer = <meta name="referrer" content="no-referrer" />

async function call(body: Record<string, unknown>) {
  const response = await fetch('/api/manage-booking', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const result = await response.json().catch(() => ({})) as { booking?: ManagedBooking; url?: string; error?: string; change?: string }
  return { ok: response.ok, ...result }
}

function longDate(iso: string, lang: Lang) {
  return new Intl.DateTimeFormat(locales[lang], { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(`${iso}T12:00:00Z`))
}

function deadlineLabel(iso: string, lang: Lang) {
  return new Intl.DateTimeFormat(locales[lang], { weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit', timeZone: 'Europe/Paris' }).format(new Date(iso))
}

function ChangeForm({ booking, blocks, token, lang, onDone, onBack }: {
  booking: ManagedBooking; blocks: AvailabilityBlock[]; token: string; lang: Lang
  onDone: (booking: ManagedBooking) => void; onBack: () => void
}) {
  const m = manageUi[lang]
  const p = payUi[lang]
  const t = bookingUi[lang]
  const [suite, setSuite] = useState(booking.suite)
  const [arrival, setArrival] = useState(booking.arrival)
  const [departure, setDeparture] = useState(booking.departure)
  const [guests, setGuests] = useState(String(booking.guests))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const money = (cents: number) => formatEuros(cents, locales[lang])
  const firstBookable = addDays(parisToday(), MIN_DAYS_BEFORE_ARRIVAL)
  const priced = arrival && departure ? quote(suite, arrival, departure, Number(guests), parisToday()) : null
  const next = priced && !('error' in priced) ? priced : null
  const difference = next ? next.total - booking.amount_total : 0
  const unchanged = suite === booking.suite && arrival === booking.arrival && departure === booking.departure && Number(guests) === booking.guests
  const maxGuests = isPricedSuite(suite) ? RATES[suite].maxGuests : 2

  function changeSuite(id: string) {
    setSuite(id)
    setError('')
    if (arrival && departure && !freeResource(blocks, [id], arrival, departure)) { setArrival(''); setDeparture('') }
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (saving) return
    if (!arrival || !departure) return setError(t.pickDates)
    if (priced && 'error' in priced) return setError(m.errors[priced.error] ?? m.errors.default)
    setSaving(true)
    setError('')
    try {
      const result = await call({ t: token, action: 'change', suite, arrival, departure, guests: Number(guests) })
      if (result.ok && result.url) return window.location.assign(result.url)
      if (result.ok && result.booking) return onDone(result.booking)
      setError(m.errors[result.error ?? ''] ?? m.errors.default)
    } catch {
      setError(m.errors.default)
    }
    setSaving(false)
  }

  return <form className="manage-change" onSubmit={submit}>
    <h1>{m.changeTitle}</h1>
    <p className="manage-intro">{m.changeIntro}</p>
    <fieldset className="universe-fieldset">
      <legend>{m.suite}</legend>
      <div className="suite-choices">
        {suites[lang].map((item) => {
          const taken = item.id !== suite && Boolean(arrival && departure) && !freeResource(blocks, [item.id], arrival, departure)
          return <label key={item.id} className={`suite-choice ${suite === item.id ? 'is-selected' : ''} ${taken ? 'is-taken' : ''}`}>
            <input type="radio" name="suite" value={item.id} checked={suite === item.id} onChange={() => changeSuite(item.id)} disabled={taken} />
            {item.label}
            {isPricedSuite(item.id) && <small className="suite-choice-hint">{taken ? p.suiteTaken : p.fromPerNight(money(RATES[item.id].night))}</small>}
          </label>
        })}
      </div>
    </fieldset>
    <fieldset className="universe-fieldset dates-fieldset">
      <legend>{m.dates}</legend>
      <AvailabilityCalendar key={suite} mode="range" resources={[suite]} blocks={blocks} min={firstBookable} arrival={arrival} departure={departure} onChange={(a, d) => { setArrival(a); setDeparture(d); setError('') }} />
      <div className="dates-summary" role="status">
        {arrival && <>{t.arrivalOn} <strong>{longDate(arrival, lang)}</strong>{departure && <> · {t.departureOn} <strong>{longDate(departure, lang)}</strong></>}</>}
      </div>
    </fieldset>
    <div className="form-grid">
      <label className="form-field"><span>{m.guests}</span><input name="guests" type="number" min="1" max={maxGuests} step="1" value={guests} onChange={(event) => { setGuests(event.target.value); setError('') }} required /></label>
    </div>
    {next && !unchanged && <dl className="price-summary" aria-label={p.summary}>
      <div><dt>{m.newTotal}</dt><dd>{money(next.total)}</dd></div>
      <div><dt>{m.alreadyPaid}</dt><dd>{money(booking.amount_total)}</dd></div>
      <div className="price-total"><dt>{difference > 0 ? m.toPay : difference < 0 ? m.toRefund : m.noDifference}</dt><dd>{money(Math.abs(difference))}</dd></div>
    </dl>}
    <div role="status" className="form-status pay-error">{error}</div>
    <button className="button button-burgundy form-submit" type="submit" disabled={saving || unchanged || !next} aria-busy={saving || undefined}>
      {saving ? m.saving : difference > 0 ? m.payDifference(money(difference)) : m.confirmChange} <ArrowRight size={17} />
    </button>
    <button type="button" className="text-link" onClick={onBack}>{m.back} <ArrowRight size={16} /></button>
  </form>
}

function Manage({ lang }: { lang: Lang }) {
  const m = manageUi[lang]
  const p = payUi[lang]
  const [phase, setPhase] = useState<Phase>('loading')
  const [booking, setBooking] = useState<ManagedBooking | null>(null)
  const [blocks, setBlocks] = useState<AvailabilityBlock[]>([])
  const [mode, setMode] = useState<Mode>('view')
  const [notice, setNotice] = useState<Notice>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  // Lu une fois au chargement (la page n'est servie que dans le navigateur, sans le secret dans le HTML).
  const [token] = useState(() => typeof window === 'undefined' ? '' : new URLSearchParams(window.location.search).get('t') ?? '')
  const money = (cents: number) => formatEuros(cents, locales[lang])

  async function load(secret: string) {
    const response = await fetch(`/api/manage-booking?t=${encodeURIComponent(secret)}`)
    if (!response.ok) return setPhase('not_found')
    const body = await response.json() as { booking: ManagedBooking; blocks: AvailabilityBlock[] }
    setBooking(body.booking)
    setBlocks(body.blocks)
    setPhase('ready')
  }

  useEffect(() => {
    const secret = token
    const session = new URLSearchParams(window.location.search).get('change')
    void (async () => {
      try {
        if (!secret) return setPhase('not_found')
        if (session) {
          // Retour de Stripe après le paiement d'un supplément : on applique la modification sans attendre le webhook.
          window.history.replaceState(null, '', `${window.location.pathname}?t=${secret}`)
          const result = await call({ t: secret, action: 'confirm', session })
          if (result.change === 'changed') setNotice('changed')
          if (result.change === 'refused') setNotice('refused')
        }
        await load(secret)
      } catch {
        setPhase('not_found')
      }
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps -- une seule fois, au chargement de la page
  }, [])

  async function cancel() {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      const result = await call({ t: token, action: 'cancel' })
      if (result.ok && result.booking) {
        setBooking(result.booking)
        setNotice('cancelled')
        setMode('view')
      } else setError(m.errors[result.error ?? ''] ?? m.errors.default)
    } catch {
      setError(m.errors.default)
    }
    setBusy(false)
  }

  if (phase !== 'ready' || !booking) return (
    <Layout lang={lang} page="manageBooking" title={m.eyebrow} head={referrer}>
      <p className="eyebrow">{m.eyebrow}</p>
      {phase === 'loading'
        ? <p>{m.loading}</p>
        : <><h1>{m.notFoundTitle[0]}<br /><em>{m.notFoundTitle[1]}</em></h1><p>{m.notFoundText}</p></>}
      <Link className="button button-burgundy" to={paths.home[lang]}>{p.back} <ArrowRight size={17} /></Link>
      <CallUs lang={lang} />
    </Layout>
  )

  if (booking.cancelled || booking.status === 'refunded') return (
    <Layout lang={lang} page="manageBooking" title={m.cancelledEyebrow} head={referrer}>
      {notice === 'cancelled' && <span className="confirmation-icon"><Check size={28} strokeWidth={1.2} /></span>}
      <p className="eyebrow">{m.cancelledEyebrow}</p>
      <h1>{m.cancelledTitle[0]}<br /><em>{m.cancelledTitle[1]}</em></h1>
      <p>{booking.amount_refunded ? m.cancelledText(money(booking.amount_refunded)) : m.refundedText}</p>
      <Summary booking={{ ...booking, status: 'refunded' }} lang={lang} />
      <Link className="button button-burgundy" to={`${paths.home[lang]}?reserver`}>{p.rebook} <ArrowRight size={17} /></Link>
      <CallUs lang={lang} />
    </Layout>
  )

  if (mode === 'change' && booking.can_manage) return (
    <Layout lang={lang} page="manageBooking" title={m.changeTitle} head={referrer}>
      <ChangeForm booking={booking} blocks={blocks} token={token} lang={lang}
        onBack={() => setMode('view')}
        onDone={(updated) => { setBooking(updated); setNotice('changed'); setMode('view'); void load(token); window.scrollTo(0, 0) }} />
      <CallUs lang={lang} />
    </Layout>
  )

  return (
    <Layout lang={lang} page="manageBooking" title={notice === 'changed' ? m.changedEyebrow : m.eyebrow} head={referrer}>
      {notice === 'changed' && <span className="confirmation-icon"><Check size={28} strokeWidth={1.2} /></span>}
      <p className="eyebrow">{notice === 'changed' ? m.changedEyebrow : m.eyebrow}</p>
      <h1>{m.title[0]}<br /><em>{m.title[1]}</em></h1>
      {notice === 'changed' && <p>{m.changedText}</p>}
      {notice === 'refused' && <p>{m.refusedText}</p>}
      <Summary booking={booking} lang={lang} />
      {booking.can_manage && booking.deadline
        ? mode === 'cancel'
          ? <div className="manage-cancel" role="group" aria-labelledby="cancel-title">
            <h2 id="cancel-title">{m.cancelTitle}</h2>
            <p>{m.cancelText(money(booking.amount_total))}</p>
            <div role="status" className="form-status pay-error">{error}</div>
            <button type="button" className="button button-burgundy" onClick={() => void cancel()} disabled={busy} aria-busy={busy || undefined}>{busy ? m.cancelling : m.cancelConfirm(money(booking.amount_total))} <ArrowRight size={17} /></button>
            <button type="button" className="text-link" onClick={() => { setMode('view'); setError('') }}>{m.keep} <ArrowRight size={16} /></button>
          </div>
          : <>
            <p className="manage-deadline">{m.until(deadlineLabel(booking.deadline, lang))}</p>
            <button type="button" className="button button-burgundy" onClick={() => { setMode('change'); setNotice(null) }}>{m.modify} <ArrowRight size={17} /></button>
            <button type="button" className="text-link" onClick={() => setMode('cancel')}>{m.cancel} <ArrowRight size={16} /></button>
          </>
        : <p className="manage-deadline">{m.closed}</p>}
      <CallUs lang={lang} />
    </Layout>
  )
}

export const ManageBookingFr = () => <Manage lang="fr" />
export const ManageBookingEn = () => <Manage lang="en" />
