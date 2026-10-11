// Calculs de dates en UTC (chaînes ISO aaaa-mm-jj) pour le calendrier des disponibilités.

export interface AvailabilityBlock {
  resource: string
  start_date: string
  end_date: string
}

export function addDays(iso: string, days: number) {
  const date = new Date(`${iso}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

export function nightsBetween(arrival: string, departure: string) {
  return Math.round((Date.parse(`${departure}T12:00:00Z`) - Date.parse(`${arrival}T12:00:00Z`)) / 86400000)
}

export function monthStart(iso: string) {
  return `${iso.slice(0, 7)}-01`
}

export function addMonths(iso: string, months: number) {
  const date = new Date(`${iso}T12:00:00Z`)
  date.setUTCDate(1)
  date.setUTCMonth(date.getUTCMonth() + months)
  return date.toISOString().slice(0, 10)
}

export function isBooked(blocks: AvailabilityBlock[], resource: string, day: string) {
  return blocks.some((block) => block.resource === resource && block.start_date <= day && day < block.end_date)
}

/** Une même ressource est-elle libre pour chaque nuit de [arrivée, départ) ? */
export function freeResource(blocks: AvailabilityBlock[], resources: string[], arrival: string, departure: string) {
  return resources.find((resource) => {
    for (let day = arrival; day < departure; day = addDays(day, 1)) if (isBooked(blocks, resource, day)) return false
    return true
  })
}
