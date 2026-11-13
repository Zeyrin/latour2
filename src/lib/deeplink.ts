import { suiteIds, type SuiteId } from './content'

/** Réservation pré-remplie depuis l'adresse de la page (publicité, Instagram, partenaire, e-mail). */
export interface BookingLink { suite?: SuiteId; arrival?: string; departure?: string; guests?: string }

const DATE = /^\d{4}-\d{2}-\d{2}$/
const first = (params: URLSearchParams, names: string[]) => names.map((name) => params.get(name)).find((value) => value !== null) ?? null
const validDate = (value: string | null) => value && DATE.test(value) && !Number.isNaN(Date.parse(`${value}T12:00:00Z`)) ? value : undefined

/**
 * Lit `?reserver&suite=eau&arrivee=2026-12-04&depart=2026-12-06&personnes=2`
 * (ou en anglais : `?book&suite=eau&checkin=…&checkout=…&adults=2`).
 * Renvoie null si l'adresse ne demande pas de réservation.
 */
export function readBookingLink(search: string): BookingLink | null {
  const params = new URLSearchParams(search)
  const keys = ['reserver', 'book', 'suite', 'arrivee', 'checkin', 'arrival']
  if (!keys.some((key) => params.has(key))) return null
  const suite = first(params, ['suite', 'room'])?.toLowerCase()
  const arrival = validDate(first(params, ['arrivee', 'checkin', 'arrival']))
  let departure = validDate(first(params, ['depart', 'checkout', 'departure']))
  if (arrival && departure && departure <= arrival) departure = undefined
  const guests = first(params, ['personnes', 'adults', 'guests'])
  return {
    suite: suiteIds.includes(suite as SuiteId) ? suite as SuiteId : undefined,
    arrival,
    departure: arrival ? departure : undefined,
    guests: guests && /^\d{1,2}$/.test(guests) && Number(guests) > 0 ? guests : undefined,
  }
}
