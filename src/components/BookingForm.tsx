import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ArrowRight, Check, Copy, Mail, Phone } from 'lucide-react'
import { contact, suites, universes, type SuiteId, type UniverseId } from '../lib/content'
import { locales, useLang, type Lang } from '../lib/i18n'
import { bookingUi, payUi } from '../lib/ui'
import { MIN_DAYS_BEFORE_ARRIVAL, RATES, formatEuros, isPricedSuite, parisToday, quote, type Quote } from '../lib/pricing'
import { AvailabilityCalendar } from './AvailabilityCalendar'
import { addDays, freeResource, isBooked, nightsBetween, type AvailabilityBlock } from '../lib/availability'

interface BookingFormProps {
  initialUniverse?: UniverseId
  initialMessage?: string
  initialSuite?: SuiteId
}

function dateLabel(value: string, lang: Lang) {
  if (!value) return bookingUi[lang].toAgree
  return new Intl.DateTimeFormat(locales[lang], { dateStyle: 'long' }).format(new Date(`${value}T12:00:00`))
}

function resourcesFor(universe: UniverseId | undefined, suite: SuiteId | '') {
  if (universe === 'suites') return suite ? [suite] : suites.fr.map((item) => item.id)
  return universe ? [universe] : []
}

async function loadAvailability(): Promise<AvailabilityBlock[] | null> {
  // Servi par api/availability.ts (clé Supabase uniquement côté serveur).
  try {
    const response = await fetch('/api/availability')
    if (!response.ok) return null
    const blocks: unknown = await response.json()
    return Array.isArray(blocks) ? blocks as AvailabilityBlock[] : null
  } catch {
    return null
  }
}

/** Le paiement en ligne n'est proposé que s'il est configuré côté serveur (api/checkout.ts). */
async function loadOnlineBooking() {
  try {
    const response = await fetch('/api/checkout')
    if (!response.ok) return false
    const body = await response.json() as { enabled?: unknown }
    return body.enabled === true
  } catch {
    return false
  }
}

async function saveRequest(values: FormData, universe?: UniverseId, suite?: SuiteId | '') {
  if (values.get('website')) return
  try {
    // Enregistré par api/booking-request.ts (clé Supabase uniquement côté serveur).
    await fetch('/api/booking-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: String(values.get('name') || '').trim(),
        email: String(values.get('email') || '').trim(),
        phone: String(values.get('phone') || '').trim() || null,
        universe: universe ?? null,
        suite: universe === 'suites' && suite ? suite : null,
        arrival: String(values.get('arrival') || '') || null,
        departure: String(values.get('departure') || '') || null,
        guests: Number(values.get('guests')) || null,
        message: String(values.get('message') || '').trim() || null,
      }),
      keepalive: true,
    })
  } catch {
    // ponytail: échec silencieux, le brouillon e-mail reste disponible
  }
}

export function BookingForm({ initialUniverse, initialMessage = '', initialSuite }: BookingFormProps) {
  const lang = useLang()
  const t = bookingUi[lang]
  const [universe, setUniverse] = useState<UniverseId | undefined>(initialUniverse)
  const [arrival, setArrival] = useState('')
  const [departure, setDeparture] = useState('')
  const [draft, setDraft] = useState('')
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState(false)
  const [guestName, setGuestName] = useState('')
  const [savedValues, setSavedValues] = useState<Record<string, string>>({})
  const [suite, setSuite] = useState<SuiteId | ''>(initialSuite ?? '')
  const [blocks, setBlocks] = useState<AvailabilityBlock[]>([])
  const [availability, setAvailability] = useState<'loading' | 'ready' | 'offline'>('loading')
  const [dateError, setDateError] = useState('')
  const [payOnline, setPayOnline] = useState(false)
  const [paying, setPaying] = useState(false)
  const [payError, setPayError] = useState('')
  const [guests, setGuests] = useState('2')
  const p = payUi[lang]
  const datesRef = useRef<HTMLFieldSetElement>(null)
  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const resources = resourcesFor(universe, suite)
  const nights = arrival && departure ? nightsBetween(arrival, departure) : 0
  const online = payOnline && universe === 'suites'
  const maxGuests = online && isPricedSuite(suite) ? RATES[suite].maxGuests : 500
  const priced = online && suite && arrival && departure ? quote(suite, arrival, departure, Number(guests), parisToday()) : null
  const currentQuote: Quote | null = priced && !('error' in priced) ? priced : null
  const money = (cents: number) => formatEuros(cents, locales[lang])

  useEffect(() => {
    let active = true
    void loadAvailability().then((result) => {
      if (!active) return
      setBlocks(result ?? [])
      setAvailability(result ? 'ready' : 'offline')
    })
    void loadOnlineBooking().then((enabled) => { if (active) setPayOnline(enabled) })
    return () => { active = false }
  }, [])

  async function refreshAvailability() {
    const result = await loadAvailability()
    if (result) setBlocks(result)
  }

  function changeDates(nextArrival: string, nextDeparture: string) {
    setArrival(nextArrival)
    setDeparture(nextDeparture)
    setDateError('')
    setPayError('')
  }

  function changeUniverse(next: UniverseId) {
    setUniverse(next)
    changeDates('', '')
  }

  function changeSuite(next: SuiteId | '') {
    setSuite(next)
    const nextResources = resourcesFor(universe, next)
    if (arrival && departure ? !freeResource(blocks, nextResources, arrival, departure) : arrival && nextResources.every((resource) => isBooked(blocks, resource, arrival))) changeDates('', '')
  }

  async function pay(values: FormData) {
    if (paying) return
    setPaying(true)
    setPayError('')
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lang,
          suite,
          arrival,
          departure,
          guests: Number(values.get('guests')),
          name: String(values.get('name') || '').trim(),
          email: String(values.get('email') || '').trim(),
          phone: String(values.get('phone') || '').trim() || null,
          message: String(values.get('message') || '').trim() || null,
          website: String(values.get('website') || ''),
        }),
      })
      const body = await response.json().catch(() => ({})) as { url?: string; error?: string }
      if (response.ok && body.url) {
        window.location.assign(body.url)
        return
      }
      if (body.error === 'unavailable') {
        changeDates('', '')
        void refreshAvailability()
      }
      setPayError(p.errors[body.error ?? ''] ?? p.errors.default)
    } catch {
      setPayError(p.errors.default)
    }
    setPaying(false)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (online && !suite) {
      setPayError(p.pickSuite)
      return
    }
    if (universe === 'suites' && (!arrival || !departure)) {
      setDateError(arrival ? t.pickDeparture : t.pickDates)
      datesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      datesRef.current?.querySelector<HTMLButtonElement>('.calendar-day:not([aria-disabled])')?.focus({ preventScroll: true })
      return
    }
    const values = new FormData(event.currentTarget)
    if (online) {
      if (priced && 'error' in priced) return setPayError(p.errors[priced.error] ?? p.errors.default)
      void pay(values)
      return
    }
    void saveRequest(values, universe, suite)
    setSavedValues(Object.fromEntries(Array.from(values.entries()).map(([key, value]) => [key, String(value)])))
    setCopied(false)
    setCopyError(false)
    const name = String(values.get('name') || '').trim()
    setGuestName(name)
    const category = universes[lang].find((item) => item.id === universe)?.label || t.defaultCategory
    const suiteLabel = suites[lang].find((item) => item.id === suite)?.label || t.noPreference
    const sep = lang === 'fr' ? ' : ' : ': '
    const message = [
      t.greeting,
      '',
      universe === 'suites' ? t.wantStay(category) : t.wantVisit(category),
      '',
      ...(universe === 'suites'
        ? [`${t.suite}${sep}${suiteLabel}`, `${t.arrival}${sep}${dateLabel(arrival, lang)}`, `${t.departure}${sep}${dateLabel(departure, lang)} (${t.nightsCount(nights)})`]
        : [`${t.wishedDate}${sep}${dateLabel(arrival, lang)}`]),
      `${t.guestsLine}${sep}${values.get('guests')}`,
      '',
      String(values.get('message') || t.defaultMessage),
      '',
      `${t.nameLine}${sep}${name}`,
      `${t.emailLine}${sep}${values.get('email')}`,
      ...(values.get('phone') ? [`${t.phoneLine}${sep}${values.get('phone')}`] : []),
      '',
      t.thanks,
    ].join('\n')
    setDraft(message)
    window.setTimeout(() => document.getElementById('draft-heading')?.focus(), 50)
  }

  async function copyDraft() {
    try {
      await navigator.clipboard.writeText(draft)
      setCopied(true)
      setCopyError(false)
    } catch {
      setCopyError(true)
    }
  }

  if (draft) {
    const mailto = `mailto:${contact.email}?subject=${encodeURIComponent(t.subject(guestName))}&body=${encodeURIComponent(draft)}`
    return (
      <div className="booking-confirmation">
        <span className="confirmation-icon"><Check size={28} strokeWidth={1.2} /></span>
        <p className="eyebrow">{t.confirmEyebrow}</p>
        <h2 id="draft-heading" tabIndex={-1}>{t.confirmTitle[0]}<br /><em>{t.confirmTitle[1]}</em></h2>
        <p>{t.confirmText}</p>
        <div className="draft-preview" tabIndex={0} role="region" aria-label={t.draftLabel}><pre>{draft}</pre></div>
        <a className="button button-burgundy" href={mailto}><Mail size={16} /> {t.sendEmail} <ArrowRight size={17} /></a>
        <button type="button" className="copy-button" onClick={copyDraft}>{copied ? <Check size={15} /> : <Copy size={15} />}{copied ? t.copied : t.copy}</button>
        <div role="status" className="form-status">{copyError && t.copyError}</div>
        <p className="form-note">{t.confirmNote}</p>
        <button type="button" className="text-link" onClick={() => setDraft('')}>{t.edit} <ArrowRight size={16} /></button>
      </div>
    )
  }

  return (
    <div className="booking-content">
      <p className="eyebrow">{t.eyebrow}</p>
      <h2>{t.title[0]}<br /><em>{t.title[1]}</em></h2>
      <p className="booking-intro">{online ? p.intro : t.intro}</p>
      <form onSubmit={handleSubmit}>
        <fieldset className="universe-fieldset">
          <legend>{t.comingFor}</legend>
          <div className="booking-universes">
            {universes[lang].filter((item) => item.id !== 'spa').map((item) => <label key={item.id} className={`universe-choice ${universe === item.id ? 'is-selected' : ''}`}>
              <input type="radio" name="universe" value={item.id} checked={universe === item.id} onChange={() => changeUniverse(item.id)} required />
              <span className="choice-number">{item.number}</span>
              <span>{t.choices[item.id]}</span>
              <Check size={14} className="choice-check" />
            </label>)}
          </div>
        </fieldset>
        {universe === 'suites' && <fieldset className="universe-fieldset">
          <legend>{t.mySuite}</legend>
          <div className="suite-choices">
            {[{ id: '' as const, label: t.noPreference }, ...suites[lang]].map((item) => {
              const taken = online && Boolean(item.id) && Boolean(arrival && departure) && !freeResource(blocks, [item.id], arrival, departure)
              const fromPrice = online && isPricedSuite(item.id) ? p.fromPerNight(money(RATES[item.id].night)) : ''
              return <label key={item.id || 'any'} className={`suite-choice ${suite === item.id ? 'is-selected' : ''} ${taken ? 'is-taken' : ''}`}>
                <input type="radio" name="suite" value={item.id} checked={suite === item.id} onChange={() => changeSuite(item.id)} disabled={taken} aria-describedby={fromPrice || taken ? `suite-hint-${item.id}` : undefined} />
                {item.label}
                {(fromPrice || taken) && <small id={`suite-hint-${item.id}`} className="suite-choice-hint">{taken ? p.suiteTaken : fromPrice}</small>}
              </label>
            })}
          </div>
        </fieldset>}
        <fieldset className="universe-fieldset dates-fieldset" ref={datesRef}>
          <legend>{universe === 'suites' ? <>{t.myStayDates} <span aria-hidden="true">*</span></> : t.myDate}</legend>
          {universe
            ? <AvailabilityCalendar key={universe} mode={universe === 'suites' ? 'range' : 'single'} resources={resources} blocks={blocks} min={online ? addDays(today, MIN_DAYS_BEFORE_ARRIVAL) : today} arrival={arrival} departure={departure} onChange={changeDates} />
            : <p className="dates-placeholder">{t.datesPlaceholder}</p>}
          <input type="hidden" name="arrival" value={arrival} />
          <input type="hidden" name="departure" value={universe === 'suites' ? departure : ''} />
          <div className="dates-summary" role="status">
            {dateError
              ? <span className="dates-error">{dateError}</span>
              : universe === 'suites' && arrival
                ? <>{t.arrivalOn} <strong>{dateLabel(arrival, lang)}</strong>{departure && <> · {t.departureOn} <strong>{dateLabel(departure, lang)}</strong> · {t.nightsCount(nights)}</>}</>
                : universe && arrival ? <>{t.on} <strong>{dateLabel(arrival, lang)}</strong></> : null}
          </div>
          {universe && availability === 'offline' && <p className="dates-note">{t.offline}</p>}
          {universe && universe !== 'suites' && <p className="dates-note">{t.optional}</p>}
        </fieldset>
        <div className="form-grid">
          <label className="form-field"><span>{t.name} <span aria-hidden="true">*</span></span><input name="name" autoComplete="name" required maxLength={100} defaultValue={savedValues.name || ''} placeholder={t.namePlaceholder} /></label>
          <label className="form-field"><span>{t.email} <span aria-hidden="true">*</span></span><input name="email" type="email" autoComplete="email" required maxLength={200} defaultValue={savedValues.email || ''} placeholder={t.emailPlaceholder} /></label>
          <label className="form-field"><span>{t.phone}</span><input type="tel" name="phone" autoComplete="tel" maxLength={40} defaultValue={savedValues.phone || ''} placeholder={t.phonePlaceholder} /></label>
          <label className="form-field"><span>{t.guests} <span aria-hidden="true">*</span></span><input name="guests" type="number" min="1" max={maxGuests} step="1" value={guests} onChange={(event) => { setGuests(event.target.value); setPayError('') }} required aria-describedby={online && Number(guests) > maxGuests ? 'guests-error' : undefined} />{online && Number(guests) > maxGuests && <small id="guests-error" className="dates-error">{p.maxGuests(maxGuests)}</small>}</label>
          <label className="form-field form-field-wide"><span>{t.message}</span><textarea name="message" rows={3} maxLength={2000} defaultValue={savedValues.message ?? initialMessage} placeholder={t.messagePlaceholder} /></label>
        </div>
        <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: 'absolute', left: '-9999px' }} />
        <label className="consent"><input type="checkbox" name="consent" required defaultChecked={savedValues.consent === 'on'} /><span>{t.consent} <span aria-hidden="true">*</span></span></label>
        {online && currentQuote && <dl className="price-summary" aria-label={p.summary}>
          <div><dt>{p.lodging(currentQuote.nights)}</dt><dd>{money(currentQuote.lodging)}</dd></div>
          {currentQuote.touristTax > 0 && <div><dt>{p.touristTax}</dt><dd>{money(currentQuote.touristTax)}</dd></div>}
          <div className="price-total"><dt>{p.total}</dt><dd>{money(currentQuote.total)}</dd></div>
        </dl>}
        <div role="status" className="form-status pay-error">{payError}</div>
        <button className="button button-burgundy form-submit" type="submit" disabled={paying} aria-busy={paying || undefined}>
          {online ? (paying ? p.submitting : currentQuote ? p.submit(money(currentQuote.total)) : p.submit('').trim()) : t.submit} <ArrowRight size={17} />
        </button>
        <p className="form-note">{online ? p.note : t.formNote}</p>
      </form>
      <a className="booking-phone" href={`tel:${contact.phoneLink}`}><Phone size={15} strokeWidth={1.25} /> {t.callUs} <span>{contact.phone}</span></a>
    </div>
  )
}
