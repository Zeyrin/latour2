import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ArrowRight, Check, Copy, Mail, Phone } from 'lucide-react'
import { contact, suites, universes, type SuiteId, type UniverseId } from '../lib/content'
import { AvailabilityCalendar } from './AvailabilityCalendar'
import { freeResource, isBooked, nightsBetween, type AvailabilityBlock } from '../lib/availability'

interface BookingFormProps {
  initialUniverse?: UniverseId
  initialMessage?: string
}

function dateLabel(value: string) {
  if (!value) return 'À convenir ensemble'
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(new Date(`${value}T12:00:00`))
}

function resourcesFor(universe: UniverseId | undefined, suite: SuiteId | '') {
  if (universe === 'suites') return suite ? [suite] : suites.map((item) => item.id)
  return universe ? [universe] : []
}

async function loadAvailability(): Promise<AvailabilityBlock[] | null> {
  const url = import.meta.env.VITE_SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) return null
  try {
    const response = await fetch(`${url}/rest/v1/availability?select=resource,start_date,end_date`, { headers: { apikey: key, Authorization: `Bearer ${key}` } })
    if (!response.ok) return null
    return await response.json() as AvailabilityBlock[]
  } catch {
    return null
  }
}

async function saveRequest(values: FormData, universe?: UniverseId, suite?: SuiteId | '') {
  const url = import.meta.env.VITE_SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!url || !key || values.get('website')) return
  try {
    await fetch(`${url}/rest/v1/booking_requests`, {
      method: 'POST',
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
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

export function BookingForm({ initialUniverse, initialMessage = '' }: BookingFormProps) {
  const [universe, setUniverse] = useState<UniverseId | undefined>(initialUniverse)
  const [arrival, setArrival] = useState('')
  const [departure, setDeparture] = useState('')
  const [draft, setDraft] = useState('')
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState(false)
  const [guestName, setGuestName] = useState('')
  const [savedValues, setSavedValues] = useState<Record<string, string>>({})
  const [suite, setSuite] = useState<SuiteId | ''>('')
  const [blocks, setBlocks] = useState<AvailabilityBlock[]>([])
  const [availability, setAvailability] = useState<'loading' | 'ready' | 'offline'>('loading')
  const [dateError, setDateError] = useState('')
  const datesRef = useRef<HTMLFieldSetElement>(null)
  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const resources = resourcesFor(universe, suite)
  const nights = arrival && departure ? nightsBetween(arrival, departure) : 0

  useEffect(() => {
    let active = true
    void loadAvailability().then((result) => {
      if (!active) return
      setBlocks(result ?? [])
      setAvailability(result ? 'ready' : 'offline')
    })
    return () => { active = false }
  }, [])

  function changeDates(nextArrival: string, nextDeparture: string) {
    setArrival(nextArrival)
    setDeparture(nextDeparture)
    setDateError('')
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

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (universe === 'suites' && (!arrival || !departure)) {
      setDateError(arrival ? 'Choisissez votre date de départ dans le calendrier.' : 'Choisissez vos dates d’arrivée et de départ dans le calendrier.')
      datesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      datesRef.current?.querySelector<HTMLButtonElement>('.calendar-day:not([aria-disabled])')?.focus({ preventScroll: true })
      return
    }
    const values = new FormData(event.currentTarget)
    void saveRequest(values, universe, suite)
    setSavedValues(Object.fromEntries(Array.from(values.entries()).map(([key, value]) => [key, String(value)])))
    setCopied(false)
    setCopyError(false)
    const name = String(values.get('name') || '').trim()
    setGuestName(name)
    const category = universes.find((item) => item.id === universe)?.label || 'Une parenthèse au château'
    const suiteLabel = suites.find((item) => item.id === suite)?.label || 'Sans préférence'
    const message = [
      'Bonjour Corinne et André,',
      '',
      universe === 'suites' ? `Je souhaite réserver un séjour au Château Latour Ségur : ${category}.` : `Je souhaite préparer ma venue au Château Latour Ségur : ${category}.`,
      '',
      ...(universe === 'suites'
        ? [`Suite : ${suiteLabel}`, `Arrivée : ${dateLabel(arrival)}`, `Départ : ${dateLabel(departure)} (${nights} nuit${nights > 1 ? 's' : ''})`]
        : [`Date souhaitée : ${dateLabel(arrival)}`]),
      `Nombre de personnes : ${values.get('guests')}`,
      '',
      String(values.get('message') || 'Je serais ravi(e) d’échanger avec vous sur les possibilités et les disponibilités.'),
      '',
      `Nom : ${name}`,
      `Adresse e-mail : ${values.get('email')}`,
      ...(values.get('phone') ? [`Téléphone : ${values.get('phone')}`] : []),
      '',
      'Merci et à bientôt !',
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
    const mailto = `mailto:${contact.email}?subject=${encodeURIComponent(`Une parenthèse au château — ${guestName}`)}&body=${encodeURIComponent(draft)}`
    return (
      <div className="booking-confirmation">
        <span className="confirmation-icon"><Check size={28} strokeWidth={1.2} /></span>
        <p className="eyebrow">Le début d’une belle parenthèse</p>
        <h2 id="draft-heading" tabIndex={-1}>Votre demande<br /><em>est prête.</em></h2>
        <p>Un dernier geste : envoyez-la depuis votre messagerie. Corinne et André vous confirmeront personnellement votre réservation et ses modalités.</p>
        <div className="draft-preview" tabIndex={0} role="region" aria-label="Votre demande préparée"><pre>{draft}</pre></div>
        <a className="button button-burgundy" href={mailto}><Mail size={16} /> Envoyer par e-mail <ArrowRight size={17} /></a>
        <button type="button" className="copy-button" onClick={copyDraft}>{copied ? <Check size={15} /> : <Copy size={15} />}{copied ? 'Votre demande a été copiée' : 'Copier ma demande'}</button>
        <div role="status" className="form-status">{copyError && 'Vous pouvez sélectionner le texte ci-dessus et le copier dans votre messagerie.'}</div>
        <p className="form-note">La réservation n’est définitive qu’après confirmation du château. Les tarifs et modalités vous seront communiqués directement.</p>
        <button type="button" className="text-link" onClick={() => setDraft('')}>Modifier ma demande <ArrowRight size={16} /></button>
      </div>
    )
  }

  return (
    <div className="booking-content">
      <p className="eyebrow">Votre parenthèse commence ici</p>
      <h2>Faisons place<br /><em>à vos envies.</em></h2>
      <p className="booking-intro">Un séjour, un moment pour soi, un événement à imaginer. Racontez-nous ce qui vous ferait plaisir.</p>
      <form onSubmit={handleSubmit}>
        <fieldset className="universe-fieldset">
          <legend>Je viens pour…</legend>
          <div className="booking-universes">
            {universes.map((item) => <label key={item.id} className={`universe-choice ${universe === item.id ? 'is-selected' : ''}`}>
              <input type="radio" name="universe" value={item.id} checked={universe === item.id} onChange={() => changeUniverse(item.id)} required />
              <span className="choice-number">{item.number}</span>
              <span>{item.id === 'suites' ? 'Les suites' : item.id === 'spa' ? 'Le spa' : 'Événements'}</span>
              <Check size={14} className="choice-check" />
            </label>)}
          </div>
        </fieldset>
        {universe === 'suites' && <fieldset className="universe-fieldset">
          <legend>Ma suite</legend>
          <div className="suite-choices">
            {[{ id: '' as const, label: 'Sans préférence' }, ...suites].map((item) => <label key={item.id || 'any'} className={`suite-choice ${suite === item.id ? 'is-selected' : ''}`}>
              <input type="radio" name="suite" value={item.id} checked={suite === item.id} onChange={() => changeSuite(item.id)} />
              {item.label}
            </label>)}
          </div>
        </fieldset>}
        <fieldset className="universe-fieldset dates-fieldset" ref={datesRef}>
          <legend>{universe === 'suites' ? <>Mes dates de séjour <span aria-hidden="true">*</span></> : 'Ma date souhaitée'}</legend>
          {universe
            ? <AvailabilityCalendar key={universe} mode={universe === 'suites' ? 'range' : 'single'} resources={resources} blocks={blocks} min={today} arrival={arrival} departure={departure} onChange={changeDates} />
            : <p className="dates-placeholder">Choisissez d’abord ce qui vous amène : le calendrier des disponibilités s’affichera ici.</p>}
          <input type="hidden" name="arrival" value={arrival} />
          <input type="hidden" name="departure" value={universe === 'suites' ? departure : ''} />
          <div className="dates-summary" role="status">
            {dateError
              ? <span className="dates-error">{dateError}</span>
              : universe === 'suites' && arrival
                ? <>Arrivée le <strong>{dateLabel(arrival)}</strong>{departure && <> · départ le <strong>{dateLabel(departure)}</strong> · {nights} nuit{nights > 1 ? 's' : ''}</>}</>
                : universe && arrival ? <>Le <strong>{dateLabel(arrival)}</strong></> : null}
          </div>
          {universe && availability === 'offline' && <p className="dates-note">Le calendrier en ligne est momentanément indisponible : indiquez vos dates, le château vous confirmera ses disponibilités.</p>}
          {universe && universe !== 'suites' && <p className="dates-note">Facultatif : laissez vide si vos dates restent à convenir.</p>}
        </fieldset>
        <div className="form-grid">
          <label className="form-field"><span>Votre nom <span aria-hidden="true">*</span></span><input name="name" autoComplete="name" required maxLength={100} defaultValue={savedValues.name || ''} placeholder="Prénom et nom" /></label>
          <label className="form-field"><span>Votre e-mail <span aria-hidden="true">*</span></span><input name="email" type="email" autoComplete="email" required defaultValue={savedValues.email || ''} placeholder="vous@exemple.fr" /></label>
          <label className="form-field"><span>Votre téléphone</span><input type="tel" name="phone" autoComplete="tel" defaultValue={savedValues.phone || ''} placeholder="Votre numéro" /></label>
          <label className="form-field"><span>Nombre de personnes <span aria-hidden="true">*</span></span><input name="guests" type="number" min="1" step="1" defaultValue={savedValues.guests || '2'} required /></label>
          <label className="form-field form-field-wide"><span>Vos envies, en quelques mots</span><textarea name="message" rows={3} maxLength={2000} defaultValue={savedValues.message ?? initialMessage} placeholder="Une occasion particulière, un soin, une attention…" /></label>
        </div>
        <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: 'absolute', left: '-9999px' }} />
        <label className="consent"><input type="checkbox" name="consent" required defaultChecked={savedValues.consent === 'on'} /><span>J’accepte que mes coordonnées soient utilisées pour répondre à cette demande. <span aria-hidden="true">*</span></span></label>
        <button className="button button-burgundy form-submit" type="submit">Préparer ma demande <ArrowRight size={17} /></button>
        <p className="form-note">* Champs obligatoires. Les dates affichées comme disponibles le sont à titre indicatif : votre réservation est confirmée personnellement par le château, sans paiement en ligne.</p>
      </form>
      <a className="booking-phone" href={`tel:${contact.phoneLink}`}><Phone size={15} strokeWidth={1.25} /> Vous préférez nous appeler ? <span>{contact.phone}</span></a>
    </div>
  )
}
