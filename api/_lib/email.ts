// E-mails envoyés par le site avec Resend (https://resend.com).
//
// Variables d'environnement (Vercel → Settings → Environment Variables) :
//   RESEND_API_KEY  clé Resend « Sending access » (re_…). Sans elle, aucun e-mail n'est envoyé.
//   OWNER_EMAIL     adresse qui reçoit les alertes (réservation payée, demande du formulaire, paiement à rembourser).
//   EMAIL_FROM      expéditeur, sur un domaine vérifié dans Resend, par exemple
//                   « Château Latour Ségur <reservations@mail.chambredhotesaintemilion.fr> ».
//                   Tant qu'il est absent, les alertes partent de onboarding@resend.dev, qui n'écrit
//                   qu'à l'adresse du compte Resend, et la confirmation au client n'est pas envoyée.
//   EMAIL_REPLY_TO  facultatif : adresse qui reçoit les réponses (contact@chateaulatoursegur.com par défaut).
//
// Un e-mail qui échoue n'empêche jamais la réservation : l'erreur est seulement notée dans les journaux.

import { Resend } from 'resend'
import { CANCELLATION_TERMS, formatEuros } from '../../src/lib/pricing.js'
import type { BookingRow } from './supabase.js'

const TEST_SENDER = 'Château Latour Ségur <onboarding@resend.dev>'
const DEFAULT_REPLY_TO = 'contact@chateaulatoursegur.com'
const PHONE = '+33 6 24 53 75 50'
const SITE_URL = 'https://www.chambredhotesaintemilion.fr'

/** Lien « Gérer ma réservation » (mêmes chemins que MANAGE_PATHS dans api/_lib/manage.ts). */
export function manageUrl(booking: BookingRow) {
  return `${SITE_URL}${booking.lang === 'en' ? '/en/booking/manage' : '/reservation/gerer'}?t=${booking.manage_token}`
}

function button(href: string, label: string) {
  return `<a href="${escape(href)}" style="display:inline-block;padding:13px 22px;background:#6e2a2f;color:#ffffff;text-decoration:none;font-size:15px;letter-spacing:.02em">${escape(label)}</a>`
}

const SUITE_NAMES: Record<string, string> = { terre: 'Terre', eau: 'Eau', metal: 'Métal', feu: 'Feu', bois: 'Bois' }
const suiteName = (suite: string | null | undefined) => (suite ? `Suite ${SUITE_NAMES[suite] ?? suite}` : '—')

let client: Resend | null = null
function resend() {
  const key = process.env.RESEND_API_KEY
  if (!key) return null
  client ??= new Resend(key)
  return client
}

interface Message {
  to: string
  subject: string
  html: string
  text: string
  /** Même clé = un seul e-mail, même si Stripe renvoie l'événement (valable 24 h chez Resend). */
  idempotencyKey: string
  replyTo?: string
}

async function send(kind: string, message: Message, { needsOwnDomain = false } = {}) {
  const api = resend()
  if (!api) return
  const from = process.env.EMAIL_FROM?.trim()
  if (needsOwnDomain && !from) return
  try {
    const { data, error } = await api.emails.send(
      {
        from: from || TEST_SENDER,
        to: message.to,
        replyTo: message.replyTo ?? (process.env.EMAIL_REPLY_TO?.trim() || DEFAULT_REPLY_TO),
        subject: message.subject,
        html: message.html,
        text: message.text,
      },
      { idempotencyKey: message.idempotencyKey },
    )
    if (error) console.error('email', kind, error.name, error.message)
    else console.log('email', kind, data?.id)
  } catch (cause) {
    console.error('email', kind, cause instanceof Error ? cause.message : cause)
  }
}

const escape = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string)

function formatDate(iso: string, locale: string) {
  return new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${iso}T00:00:00Z`))
}

/** Mise en page commune : texte simple, une colonne, lisible sur téléphone. */
function layout(title: string, intro: string, rows: [string, string][], outro: string) {
  const table = rows
    .map(([label, value]) => `<tr><td style="padding:6px 16px 6px 0;color:#7a7066;vertical-align:top;white-space:nowrap">${escape(label)}</td><td style="padding:6px 0;color:#2b2622;white-space:pre-line">${escape(value)}</td></tr>`)
    .join('')
  return `<!doctype html><html><body style="margin:0;background:#f6f2ec;font-family:Georgia,'Times New Roman',serif">
<div style="max-width:560px;margin:0 auto;padding:32px 20px;color:#2b2622;font-size:16px;line-height:1.55">
<p style="margin:0 0 24px;font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:#7a7066">Château Latour Ségur</p>
<h1 style="margin:0 0 16px;font-size:24px;font-weight:normal">${escape(title)}</h1>
<p style="margin:0 0 20px">${intro}</p>
<table style="border-collapse:collapse;margin:0 0 24px;font-size:15px">${table}</table>
<p style="margin:0 0 20px">${outro}</p>
<p style="margin:32px 0 0;font-size:13px;color:#7a7066">1, lieu-dit Latour · 33570 Lussac — Saint-Émilion · ${PHONE}<br><a href="${SITE_URL}" style="color:#7a7066">${SITE_URL.replace('https://', '')}</a></p>
</div></body></html>`
}

const plain = (title: string, rows: [string, string][], ...paragraphs: string[]) =>
  [title, '', ...rows.map(([label, value]) => `${label} : ${value}`), '', ...paragraphs].join('\n')

function stayRows(booking: BookingRow, locale: string, fr: boolean): [string, string][] {
  return [
    [fr ? 'Suite' : 'Suite', suiteName(booking.suite)],
    [fr ? 'Arrivée' : 'Arrival', formatDate(booking.arrival, locale)],
    [fr ? 'Départ' : 'Departure', formatDate(booking.departure, locale)],
    [fr ? 'Nuits' : 'Nights', String(booking.nights)],
    [fr ? 'Personnes' : 'Guests', String(booking.guests)],
    [fr ? 'Montant payé' : 'Amount paid', formatEuros(booking.amount_total, locale)],
  ]
}

/** Confirmation envoyée au client après son paiement (nécessite EMAIL_FROM sur un domaine vérifié). */
export function sendGuestConfirmation(booking: BookingRow) {
  const fr = booking.lang !== 'en'
  const locale = fr ? 'fr-FR' : 'en-GB'
  const firstName = booking.name.split(/\s+/)[0]
  const title = fr ? 'Votre réservation est confirmée' : 'Your booking is confirmed'
  const rows = stayRows(booking, locale, fr)
  const intro = fr
    ? `Bonjour ${escape(firstName)}, merci pour votre réservation. Nous avons hâte de vous accueillir au château.`
    : `Hello ${escape(firstName)}, thank you for your booking. We look forward to welcoming you to the château.`
  const terms = CANCELLATION_TERMS[fr ? 'fr' : 'en']
  const contactLine = fr
    ? `Pour toute question, répondez simplement à cet e-mail ou appelez-nous au ${PHONE}.`
    : `For any question, just reply to this email or call us on ${PHONE}.`
  const manageLabel = fr ? 'Gérer ma réservation' : 'Manage my booking'
  const link = booking.manage_token ? manageUrl(booking) : null
  return send(
    'guest-confirmation',
    {
      to: booking.email,
      subject: fr ? `Réservation confirmée · ${suiteName(booking.suite)}` : `Booking confirmed · ${suiteName(booking.suite)}`,
      html: layout(title, intro, rows, `${escape(terms)}${link ? `<br><br>${button(link, manageLabel)}` : ''}<br><br>${escape(contactLine)}`),
      text: plain(title, rows, terms, ...(link ? [`${manageLabel} : ${link}`] : []), contactLine),
      idempotencyKey: `guest-confirmation/${booking.id}`,
    },
    { needsOwnDomain: true },
  )
}

type Previous = Pick<BookingRow, 'suite' | 'arrival' | 'departure' | 'guests' | 'amount_total'>

export interface ManageEvent {
  kind: 'cancelled' | 'changed' | 'refused'
  /** Montant remboursé automatiquement, en centimes. */
  refunded: number
  /** Supplément payé pour une modification, en centimes. */
  extraPaid?: number
  previous?: Previous
  /** Remboursements que Stripe a refusés : à faire à la main. */
  failedRefunds?: number
  beds24Failed?: boolean
  sessionId?: string
  reason?: string
}

function previousLine(previous: Previous, locale: string, fr: boolean) {
  const dates = `${formatDate(previous.arrival, locale)} → ${formatDate(previous.departure, locale)}`
  return `${suiteName(previous.suite)}, ${dates}, ${previous.guests} ${fr ? 'pers.' : 'guest(s)'}, ${formatEuros(previous.amount_total, locale)}`
}

/** E-mail au client après une annulation ou une modification faite depuis « Gérer ma réservation ». */
export function sendGuestManageEmail(booking: BookingRow, event: ManageEvent) {
  const fr = booking.lang !== 'en'
  const locale = fr ? 'fr-FR' : 'en-GB'
  const firstName = escape(booking.name.split(/\s+/)[0])
  const money = (cents: number) => formatEuros(cents, locale)
  const contactLine = fr
    ? `Pour toute question, répondez simplement à cet e-mail ou appelez-nous au ${PHONE}.`
    : `For any question, just reply to this email or call us on ${PHONE}.`
  const delay = fr ? 'Le remboursement apparaît sur votre compte sous 5 à 10 jours.' : 'The refund will reach your account within 5 to 10 days.'
  if (event.kind === 'cancelled') {
    const title = fr ? 'Votre réservation est annulée' : 'Your booking is cancelled'
    const rows: [string, string][] = [
      ...stayRows(booking, locale, fr).slice(0, 5),
      [fr ? 'Remboursé' : 'Refunded', money(event.refunded)],
    ]
    const intro = fr
      ? `Bonjour ${firstName}, votre annulation est bien prise en compte et vous êtes remboursé sur la carte utilisée pour le paiement.`
      : `Hello ${firstName}, your cancellation is confirmed and you are refunded on the card used for payment.`
    return send('guest-cancelled', {
      to: booking.email,
      subject: fr ? `Réservation annulée · ${suiteName(booking.suite)}` : `Booking cancelled · ${suiteName(booking.suite)}`,
      html: layout(title, intro, rows, `${escape(delay)}<br><br>${escape(fr ? 'Nous espérons vous accueillir une prochaine fois.' : 'We hope to welcome you another time.')}<br><br>${escape(contactLine)}`),
      text: plain(title, rows, delay, contactLine),
      idempotencyKey: `guest-cancelled/${booking.id}`,
    }, { needsOwnDomain: true })
  }
  if (event.kind !== 'changed') return
  const title = fr ? 'Votre réservation est modifiée' : 'Your booking has been changed'
  const rows: [string, string][] = [
    ...stayRows(booking, locale, fr).slice(0, 5),
    [fr ? 'Nouveau total' : 'New total', money(booking.amount_total)],
    ...(event.extraPaid ? [[fr ? 'Supplément payé' : 'Extra paid', money(event.extraPaid)] as [string, string]] : []),
    ...(event.refunded ? [[fr ? 'Remboursé' : 'Refunded', money(event.refunded)] as [string, string]] : []),
    ...(event.previous ? [[fr ? 'Avant' : 'Before', previousLine(event.previous, locale, fr)] as [string, string]] : []),
  ]
  const intro = fr ? `Bonjour ${firstName}, voici votre séjour modifié.` : `Hello ${firstName}, here is your updated stay.`
  const terms = fr
    ? 'Vous pouvez encore annuler ou modifier gratuitement jusqu’à la fin des 24 h qui suivent votre réservation initiale.'
    : 'You can still cancel or change for free until 24 hours after your original booking.'
  const link = booking.manage_token ? manageUrl(booking) : null
  return send('guest-changed', {
    to: booking.email,
    subject: fr ? `Réservation modifiée · ${suiteName(booking.suite)}` : `Booking changed · ${suiteName(booking.suite)}`,
    html: layout(title, intro, rows, `${event.refunded ? `${escape(delay)}<br><br>` : ''}${escape(terms)}${link ? `<br><br>${button(link, fr ? 'Gérer ma réservation' : 'Manage my booking')}` : ''}<br><br>${escape(contactLine)}`),
    text: plain(title, rows, ...(event.refunded ? [delay] : []), terms, ...(link ? [link] : []), contactLine),
    idempotencyKey: `guest-changed/${booking.id}/${booking.change_count ?? 0}`,
  }, { needsOwnDomain: true })
}

/** Alerte au château : annulation ou modification faite par le client, ou modification refusée (supplément remboursé). */
export function sendOwnerManageAlert(booking: BookingRow, event: ManageEvent) {
  const to = ownerTo()
  if (!to) return
  const money = (cents: number) => formatEuros(cents, 'fr-FR')
  const rows: [string, string][] = [
    ...stayRows(booking, 'fr-FR', true).slice(0, 5),
    [event.kind === 'cancelled' ? 'Montant payé' : 'Total', money(booking.amount_total)],
    ...(event.previous ? [['Avant', previousLine(event.previous, 'fr-FR', true)] as [string, string]] : []),
    ...(event.extraPaid ? [['Supplément payé', money(event.extraPaid)] as [string, string]] : []),
    ...(event.refunded ? [['Remboursé automatiquement', money(event.refunded)] as [string, string]] : []),
    ['Client', booking.name],
    ['E-mail', booking.email],
    ['Téléphone', booking.phone ?? '—'],
  ]
  const warnings = [
    event.failedRefunds ? `<strong>Stripe a refusé un remboursement de ${money(event.failedRefunds)} : faites-le à la main dans Stripe.</strong>` : '',
    event.beds24Failed ? '<strong>Beds24 n’a pas pu être mis à jour : corrigez la réservation dans Beds24.</strong>' : '',
  ].filter(Boolean)
  const [title, intro, subject] = event.kind === 'cancelled'
    ? [`Annulation · ${suiteName(booking.suite)}`, 'Le client a annulé sa réservation depuis le site, dans les 24 h. Les dates sont libérées sur le site et dans Beds24.', `Annulation : ${booking.name}, ${suiteName(booking.suite)}`]
    : event.kind === 'changed'
      ? [`Modification · ${suiteName(booking.suite)}`, 'Le client a modifié sa réservation depuis le site, dans les 24 h. Beds24 est mis à jour.', `Modification : ${booking.name}, ${suiteName(booking.suite)}`]
      : ['Modification refusée', `Le client a payé un supplément pour modifier sa réservation, mais ce n’était plus possible (${escape(event.reason ?? 'dates prises')}). Le supplément lui est remboursé ; sa réservation d’origine ci-dessous reste valable. Prévenez-le si besoin.`, `Modification impossible : ${booking.name}`]
  const outro = `Réservation ${escape(booking.id)}.`
  return send('owner-manage', {
    to,
    replyTo: booking.email,
    subject: `${warnings.length ? '⚠️ ' : ''}${subject}`,
    html: layout(title, [intro, ...warnings].join('<br><br>'), rows, outro),
    text: plain(title, rows, intro.replace(/<[^>]+>/g, ''), ...warnings.map((line) => line.replace(/<[^>]+>/g, '')), `Réservation ${booking.id}.`),
    idempotencyKey: `owner-manage/${event.kind}/${booking.id}/${event.sessionId ?? booking.change_count ?? 0}`,
  })
}

function ownerTo() {
  return process.env.OWNER_EMAIL?.trim() || null
}

/** Alerte au château : nouvelle réservation payée, ou paiement reçu pour des dates déjà prises (à rembourser). */
export function sendOwnerBookingAlert(booking: BookingRow, conflict = false) {
  const to = ownerTo()
  if (!to) return
  const rows: [string, string][] = [
    ...stayRows(booking, 'fr-FR', true),
    ['Client', booking.name],
    ['E-mail', booking.email],
    ['Téléphone', booking.phone ?? '—'],
    ['Langue', booking.lang === 'en' ? 'anglais' : 'français'],
    ['Message', booking.message ?? '—'],
  ]
  const title = conflict ? 'Paiement reçu pour des dates déjà prises' : `Nouvelle réservation · ${suiteName(booking.suite)}`
  const intro = conflict
    ? 'Le client a payé, mais la suite n’était plus libre. La réservation n’est pas confirmée : <strong>remboursez-le dans Stripe</strong> et prévenez-le.'
    : 'Une réservation vient d’être payée sur le site.'
  const outro = `Réservation ${escape(booking.id)}. Le paiement est dans Stripe.`
  return send('owner-booking', {
    to,
    replyTo: booking.email,
    subject: conflict ? `⚠️ À rembourser : ${booking.name}, ${suiteName(booking.suite)}` : `Nouvelle réservation : ${booking.name}, ${suiteName(booking.suite)}`,
    html: layout(title, intro, rows, outro),
    text: plain(title, rows, conflict ? 'Le client a payé mais la suite n’était plus libre : à rembourser dans Stripe.' : '', `Réservation ${booking.id}.`),
    idempotencyKey: `owner-booking/${booking.id}`,
  })
}

export interface RequestFields {
  name: string
  email: string
  phone: string | null
  universe: string | null
  suite: string | null
  arrival: string | null
  departure: string | null
  guests: number | null
  message: string | null
}

const UNIVERSE_NAMES: Record<string, string> = { suites: 'Suites', spa: 'Spa', evenements: 'Événements' }

/** Alerte au château pour une demande envoyée par le formulaire de contact / réservation. */
export function sendOwnerRequestAlert(request: RequestFields, requestKey: string) {
  const to = ownerTo()
  if (!to) return
  const rows: [string, string][] = [
    ['Nom', request.name],
    ['E-mail', request.email],
    ['Téléphone', request.phone ?? '—'],
    ['Pour', request.universe ? UNIVERSE_NAMES[request.universe] ?? request.universe : '—'],
    ...(request.suite ? [['Suite', suiteName(request.suite)] as [string, string]] : []),
    ['Arrivée', request.arrival ? formatDate(request.arrival, 'fr-FR') : '—'],
    ['Départ', request.departure ? formatDate(request.departure, 'fr-FR') : '—'],
    ['Personnes', request.guests ? String(request.guests) : '—'],
    ['Message', request.message ?? '—'],
  ]
  const title = `Nouvelle demande de ${request.name}`
  return send('owner-request', {
    to,
    replyTo: request.email,
    subject: `Demande du site : ${request.name}${request.universe ? ` (${UNIVERSE_NAMES[request.universe] ?? request.universe})` : ''}`,
    html: layout(title, 'Une demande vient d’arriver par le formulaire du site. Répondez directement à cet e-mail pour écrire au client.', rows, ''),
    text: plain(title, rows, 'Répondez directement à cet e-mail pour écrire au client.'),
    idempotencyKey: `owner-request/${requestKey}`,
  })
}
