// Tarifs des suites pour la réservation en ligne.
// Fichier partagé par le site (affichage du prix) et par api/checkout.ts (montant réellement facturé) :
// le serveur recalcule toujours le prix, le navigateur ne fait que l'afficher.
// Aucun import ici : ce fichier est aussi chargé par les fonctions serveur de api/.
//
// Tarifs et durées minimum repris de Beds24 (novembre 2026). Les modifier ici si les prix changent dans Beds24.

export type PricedSuite = 'terre' | 'eau' | 'metal' | 'feu' | 'bois'

export const PRICED_SUITES: PricedSuite[] = ['terre', 'eau', 'metal', 'feu', 'bois']

export interface SuiteRate {
  /** Prix d'une nuit, en centimes d'euro (taxe de séjour non comprise). */
  night: number
  /** Prix d'une nuit du vendredi ou du samedi, en centimes. Sinon `night`. */
  weekend?: number
  /** Nombre maximum de personnes. */
  maxGuests: number
  /** Durée minimum du séjour, en nuits. Sinon `MIN_NIGHTS`. */
  minNights?: number
}

export const RATES: Record<PricedSuite, SuiteRate> = {
  terre: { night: 24000, maxGuests: 3, minNights: 2 },
  eau: { night: 19500, maxGuests: 2 },
  metal: { night: 39500, maxGuests: 4, minNights: 2 },
  feu: { night: 24000, maxGuests: 2, minNights: 2 },
  bois: { night: 19500, maxGuests: 2, minNights: 2 },
}

/** Durée minimum d'un séjour par défaut, en nuits. */
export const MIN_NIGHTS = 1
/** Durée maximum d'un séjour réservable en ligne, en nuits. */
export const MAX_NIGHTS = 30
/** Taxe de séjour, en centimes, par personne et par nuit (0 pour ne pas l'ajouter). */
export const TOURIST_TAX_PER_GUEST_NIGHT = 0
/** Délai minimum entre la réservation et l'arrivée, en jours (0 : arrivée possible le jour même). */
export const MIN_DAYS_BEFORE_ARRIVAL = 1

export const CURRENCY = 'eur'

export interface Quote {
  suite: PricedSuite
  arrival: string
  departure: string
  nights: number
  guests: number
  /** Hébergement, en centimes. */
  lodging: number
  /** Taxe de séjour, en centimes. */
  touristTax: number
  /** Total à payer, en centimes. */
  total: number
}

export type QuoteError = 'suite' | 'dates' | 'too-short' | 'too-long' | 'too-soon' | 'guests'

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

function isIsoDate(value: string) {
  if (!ISO_DATE.test(value)) return false
  const date = new Date(`${value}T12:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

function nextDay(iso: string) {
  const date = new Date(`${iso}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + 1)
  return date.toISOString().slice(0, 10)
}

/** Nuits du vendredi et du samedi (jour d'arrivée de la nuit). */
function isWeekendNight(iso: string) {
  const day = new Date(`${iso}T12:00:00Z`).getUTCDay()
  return day === 5 || day === 6
}

export function isPricedSuite(value: unknown): value is PricedSuite {
  return typeof value === 'string' && (PRICED_SUITES as string[]).includes(value)
}

/**
 * Calcule le prix d'un séjour. `today` est la date du jour (aaaa-mm-jj, heure de Paris).
 * Renvoie une erreur plutôt qu'un prix si le séjour n'est pas réservable en ligne.
 */
export function quote(suite: unknown, arrival: string, departure: string, guests: number, today: string): Quote | { error: QuoteError } {
  if (!isPricedSuite(suite)) return { error: 'suite' }
  if (!isIsoDate(arrival) || !isIsoDate(departure) || departure <= arrival) return { error: 'dates' }
  const rate = RATES[suite]
  if (!Number.isInteger(guests) || guests < 1 || guests > rate.maxGuests) return { error: 'guests' }
  let earliest = today
  for (let i = 0; i < MIN_DAYS_BEFORE_ARRIVAL; i++) earliest = nextDay(earliest)
  if (arrival < earliest) return { error: 'too-soon' }
  let nights = 0
  let lodging = 0
  for (let day = arrival; day < departure; day = nextDay(day)) {
    nights++
    if (nights > MAX_NIGHTS) return { error: 'too-long' }
    lodging += isWeekendNight(day) && rate.weekend ? rate.weekend : rate.night
  }
  if (nights < (rate.minNights ?? MIN_NIGHTS)) return { error: 'too-short' }
  const touristTax = TOURIST_TAX_PER_GUEST_NIGHT * guests * nights
  return { suite, arrival, departure, nights, guests, lodging, touristTax, total: lodging + touristTax }
}

/** Date du jour à Paris (aaaa-mm-jj). */
export function parisToday(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(now)
}

export function formatEuros(cents: number, locale: string) {
  return new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR', minimumFractionDigits: cents % 100 ? 2 : 0 }).format(cents / 100)
}
