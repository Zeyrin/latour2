import { contact, suites } from './content'
import { locales, type Lang } from './i18n'
import { CANCELLATION_TERMS, MIN_NIGHTS, RATES, TOURIST_TAX_PER_GUEST_NIGHT, formatEuros } from './pricing'

/** Questions fréquentes de l'accueil, calculées à partir des tarifs et des fiches pour rester exactes. */

function prices(lang: Lang) {
  const locale = locales[lang]
  const nights = Object.values(RATES).map((rate) => rate.night)
  const min = Math.min(...nights)
  const max = Math.max(...nights)
  const cheapest = suites[lang].filter((suite) => RATES[suite.id].night === min).map((suite) => suite.label)
  const largest = suites[lang].find((suite) => RATES[suite.id].night === max)!.label
  const oneNight = suites[lang].filter((suite) => (RATES[suite.id].minNights ?? MIN_NIGHTS) === 1).map((suite) => suite.label)
  return { min: formatEuros(min, locale), max: formatEuros(max, locale), tax: formatEuros(TOURIST_TAX_PER_GUEST_NIGHT, locale), cheapest, largest, oneNight }
}

const and = (lang: Lang, items: string[]) => items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} ${lang === 'fr' ? 'et' : 'and'} ${items.at(-1)}`

/** Questions et réponses, en texte brut (affichées sur la page et reprises dans le JSON-LD FAQPage). */
export function faqItems(lang: Lang): { q: string; a: string }[] {
  const p = prices(lang)
  if (lang === 'fr') return [
    { q: 'Où se trouvent vos chambres d’hôtes ?', a: `Au Château Latour Ségur, ${contact.address}, ${contact.locality}. Le domaine est à une dizaine de kilomètres du village de Saint-Émilion, près de Libourne, et à moins d’une heure de Bordeaux.` },
    { q: 'Le spa est-il accessible aux hôtes des chambres ?', a: 'Oui. Le Spa TerreHappy® se trouve sur le domaine : piscine chauffée, hammam, bain à remous, massages et soins. Il est ouvert aux hôtes des suites comme aux visiteurs, et privatisable ; il se réserve sur spaterrehappy.fr.' },
    { q: 'Quel est le prix d’une nuit ?', a: `De ${p.min} la nuit (${and('fr', p.cheapest)}) à ${p.max} pour ${p.largest}, qui accueille jusqu’à 4 personnes. La taxe de séjour, ${p.tax} par personne et par nuit, s’ajoute au prix.` },
    { q: 'Y a-t-il une durée minimum de séjour ?', a: `Deux nuits minimum pour la plupart des suites ; ${and('fr', p.oneNight)} se réserve dès une nuit.` },
    { q: 'Le petit-déjeuner est-il compris ?', a: 'Le petit-déjeuner est servi sur demande. Le Wi-Fi, le parking privé et le linge de lit et de toilette sont compris.' },
    { q: 'Peut-on venir en famille ou entre amis ?', a: 'Oui : la Suite Métal a deux chambres et une cuisine équipée pour 4 personnes, et la Suite Terre accueille jusqu’à 3 personnes. Pour un groupe plus large ou une réception, écrivez-nous.' },
    { q: 'Quelles sont les conditions d’annulation ?', a: CANCELLATION_TERMS.fr },
    { q: 'Acceptez-vous les Chèques-Vacances ?', a: 'Oui, les Chèques-Vacances ANCV sont acceptés. Des bons cadeaux sont aussi proposés pour offrir un séjour.' },
  ]
  return [
    { q: 'Where is the B&B?', a: `At Château Latour Ségur, ${contact.address}, ${contact.locality}. The estate is about ten kilometres from the village of Saint-Émilion, near Libourne, and less than an hour from Bordeaux.` },
    { q: 'Can B&B guests use the spa?', a: 'Yes. Spa TerreHappy® is on the estate: heated pool, hammam, whirlpool bath, massages and treatments. It is open to suite guests and day visitors alike, available for private hire, and booked on spaterrehappy.fr.' },
    { q: 'How much is a night?', a: `From ${p.min} a night (${and('en', p.cheapest)}) to ${p.max} for ${p.largest}, which sleeps up to 4. Tourist tax of ${p.tax} per person per night is added.` },
    { q: 'Is there a minimum stay?', a: `Two nights for most suites; ${and('en', p.oneNight)} can be booked for a single night.` },
    { q: 'Is breakfast included?', a: 'Breakfast is served on request. Wi-Fi, private parking, bed linen and towels are included.' },
    { q: 'Can we come as a family or with friends?', a: 'Yes: the Metal Suite has two bedrooms and a fitted kitchen for 4, and the Earth Suite sleeps up to 3. For a larger group or a reception, get in touch.' },
    { q: 'What is the cancellation policy?', a: CANCELLATION_TERMS.en },
    { q: 'Do you accept Chèques-Vacances?', a: 'Yes, ANCV Chèques-Vacances are accepted. Gift vouchers are also available if you would like to offer a stay.' },
  ]
}

