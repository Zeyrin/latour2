import { useState, type FormEvent } from 'react'
import { ArrowRight, CalendarDays, Check, Copy, Mail, Phone } from 'lucide-react'
import { contact, universes, type UniverseId } from '../lib/content'

interface BookingFormProps {
  initialUniverse?: UniverseId
  initialMessage?: string
}

function dateLabel(value: string) {
  if (!value) return 'À convenir ensemble'
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(new Date(`${value}T12:00:00`))
}

function DateControl({ name, value, min, onChange }: { name: string; value: string; min: string; onChange: (value: string) => void }) {
  return <div className="date-control">
    <span aria-hidden="true">{value ? new Intl.DateTimeFormat('fr-FR').format(new Date(`${value}T12:00:00`)) : 'jj/mm/aaaa'}</span>
    <CalendarDays size={16} strokeWidth={1.2} aria-hidden="true" />
    <input type="date" name={name} value={value} min={min} lang="fr" onChange={(event) => onChange(event.target.value)} />
  </div>
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
  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const values = new FormData(event.currentTarget)
    setSavedValues(Object.fromEntries(Array.from(values.entries()).map(([key, value]) => [key, String(value)])))
    setCopied(false)
    setCopyError(false)
    const name = String(values.get('name') || '').trim()
    setGuestName(name)
    const category = universes.find((item) => item.id === universe)?.label || 'Une parenthèse au château'
    const message = [
      'Bonjour Corinne et André,',
      '',
      `Je souhaite préparer ma venue au Château Latour Ségur : ${category}.`,
      '',
      `Date souhaitée : ${dateLabel(arrival)}`,
      ...(universe === 'suites' && departure ? [`Date de départ : ${dateLabel(departure)}`] : []),
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
        <p>Un dernier geste : envoyez-la depuis votre messagerie. Corinne et André vous répondront personnellement pour convenir des détails.</p>
        <div className="draft-preview" tabIndex={0} role="region" aria-label="Votre demande préparée"><pre>{draft}</pre></div>
        <a className="button button-burgundy" href={mailto}><Mail size={16} /> Envoyer par e-mail <ArrowRight size={17} /></a>
        <button type="button" className="copy-button" onClick={copyDraft}>{copied ? <Check size={15} /> : <Copy size={15} />}{copied ? 'Votre demande a été copiée' : 'Copier ma demande'}</button>
        <div role="status" className="form-status">{copyError && 'Vous pouvez sélectionner le texte ci-dessus et le copier dans votre messagerie.'}</div>
        <p className="form-note">La demande n’a pas encore été envoyée. Les disponibilités et tarifs seront confirmés directement par le château.</p>
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
              <input type="radio" name="universe" value={item.id} checked={universe === item.id} onChange={() => setUniverse(item.id)} required />
              <span className="choice-number">{item.number}</span>
              <span>{item.id === 'suites' ? 'Les suites' : item.id === 'spa' ? 'Le spa' : 'Événements'}</span>
              <Check size={14} className="choice-check" />
            </label>)}
          </div>
        </fieldset>
        <div className="form-grid">
          <label className="form-field"><span>Votre nom <span aria-hidden="true">*</span></span><input name="name" autoComplete="name" required maxLength={100} defaultValue={savedValues.name || ''} placeholder="Prénom et nom" /></label>
          <label className="form-field"><span>Votre e-mail <span aria-hidden="true">*</span></span><input name="email" type="email" autoComplete="email" required defaultValue={savedValues.email || ''} placeholder="vous@exemple.fr" /></label>
          <label className="form-field"><span>{universe === 'suites' ? 'Date d’arrivée souhaitée' : 'Date souhaitée'}</span><DateControl name="arrival" min={today} value={arrival} onChange={(value) => { setArrival(value); if (departure && departure <= value) setDeparture('') }} /></label>
          {universe === 'suites' ? <label className="form-field"><span>Date de départ souhaitée</span><DateControl name="departure" min={arrival ? new Date(new Date(`${arrival}T12:00:00`).getTime() + 86400000).toISOString().slice(0, 10) : today} value={departure} onChange={setDeparture} /></label> : <label className="form-field"><span>Votre téléphone</span><input type="tel" name="phone" autoComplete="tel" defaultValue={savedValues.phone || ''} placeholder="Votre numéro" /></label>}
          <label className="form-field"><span>Nombre de personnes <span aria-hidden="true">*</span></span><input name="guests" type="number" min="1" step="1" defaultValue={savedValues.guests || '2'} required /></label>
          {universe === 'suites' && <label className="form-field"><span>Votre téléphone</span><input type="tel" name="phone" autoComplete="tel" defaultValue={savedValues.phone || ''} placeholder="Votre numéro" /></label>}
          <label className="form-field form-field-wide"><span>Vos envies, en quelques mots</span><textarea name="message" rows={3} maxLength={2000} defaultValue={savedValues.message ?? initialMessage} placeholder="Une occasion particulière, un soin, une attention…" /></label>
        </div>
        <label className="consent"><input type="checkbox" name="consent" required defaultChecked={savedValues.consent === 'on'} /><span>J’accepte que mes coordonnées soient utilisées pour répondre à cette demande. <span aria-hidden="true">*</span></span></label>
        <button className="button button-burgundy form-submit" type="submit">Préparer ma demande <ArrowRight size={17} /></button>
        <p className="form-note">* Champs obligatoires. Demande sans engagement, à envoyer depuis votre messagerie. Aucune réservation à cette étape.</p>
      </form>
      <a className="booking-phone" href={`tel:${contact.phoneLink}`}><Phone size={15} strokeWidth={1.25} /> Vous préférez nous appeler ? <span>{contact.phone}</span></a>
    </div>
  )
}
