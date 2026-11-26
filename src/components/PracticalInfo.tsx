import { Link } from 'react-router-dom'
import { ArrowRight, ArrowUpRight } from 'lucide-react'
import { spaUrl, suiteDetails, suites } from '../lib/content'
import { faqItems } from '../lib/faq'
import { guidesIndexPaths } from '../lib/guides'
import { locales, suitePaths, type Lang } from '../lib/i18n'
import { MIN_NIGHTS, RATES, formatEuros } from '../lib/pricing'
import { ui } from '../lib/ui'

/**
 * Bloc « En pratique » de l'accueil : situation, tarifs des suites, réservation et questions fréquentes.
 * Tout est tiré des données du site (tarifs de lib/pricing.ts, fiches de lib/content.ts) pour rester exact.
 * Les questions (lib/faq.ts) servent aussi aux données structurées FAQPage de l'accueil.
 */

const nightsLabel = (lang: Lang, n: number) => lang === 'fr' ? `${n} nuit${n > 1 ? 's' : ''} min.` : `${n}-night min.`

const text = {
  fr: {
    eyebrow: 'En pratique',
    title: ['Votre séjour en chambre d’hôtes', 'près de Saint-Émilion.'],
    location: 'Le Château Latour Ségur se trouve à Lussac, au cœur de l’appellation Lussac-Saint-Émilion, à une dizaine de kilomètres du village de Saint-Émilion, dont la juridiction est inscrite au patrimoine mondial de l’UNESCO, et à moins d’une heure de Bordeaux. Les cinq suites occupent les dépendances du château, au calme du parc et de ses étangs ; toutes ont une cheminée, et le Spa TerreHappy® est sur le domaine.',
    ratesTitle: 'Les tarifs des suites',
    ratesIntro: 'Le prix dépend surtout de la surface, du nombre de personnes et des équipements de la suite (bain à remous, deuxième chambre, cuisine). Prix par nuit pour la suite, hors taxe de séjour ; le montant exact s’affiche avant le paiement.',
    columns: ['Suite', 'Surface', 'Capacité', 'Dès, la nuit', 'Séjour'],
    stepsTitle: 'Réserver en direct',
    bookCta: 'Voir les disponibilités',
    steps: ['Choisissez votre suite et vos dates : le calendrier n’affiche que les nuits encore libres.', 'Réglez en ligne par paiement sécurisé, ou envoyez-nous une demande si vous avez une question.', 'Corinne et André vous confirment votre séjour et vous accueillent personnellement au château.'],
    faqTitle: 'Questions fréquentes',
    spaLink: 'Réserver le spa sur spaterrehappy.fr',
    guidesLink: 'Que faire autour de Saint-Émilion : nos guides',
  },
  en: {
    eyebrow: 'Good to know',
    title: ['Your bed & breakfast stay', 'near Saint-Émilion.'],
    location: 'Château Latour Ségur is in Lussac, in the heart of the Lussac-Saint-Émilion appellation, about ten kilometres from the village of Saint-Émilion, a UNESCO World Heritage site, and less than an hour from Bordeaux. The five suites are in the château’s outbuildings, in the quiet of the park and its ponds; every one has a fireplace, and Spa TerreHappy® is on the estate.',
    ratesTitle: 'Suite rates',
    ratesIntro: 'The price mainly depends on the size of the suite, the number of guests and its equipment (whirlpool bath, second bedroom, kitchen). Price per night for the suite, excluding tourist tax; the exact total is shown before payment.',
    columns: ['Suite', 'Size', 'Sleeps', 'From, per night', 'Stay'],
    stepsTitle: 'Book direct',
    bookCta: 'Check availability',
    steps: ['Choose your suite and dates: the calendar only shows nights that are still free.', 'Pay securely online, or send us a request if you have a question.', 'Corinne and André confirm your stay and welcome you personally at the château.'],
    faqTitle: 'Frequently asked questions',
    spaLink: 'Book the spa on spaterrehappy.fr',
    guidesLink: 'What to do around Saint-Émilion: our guides',
  },
}

export function PracticalInfo({ lang, onBook }: { lang: Lang; onBook: () => void }) {
  const t = text[lang]
  const locale = locales[lang]
  return (
    <section className="practical-section section-space" id="infos" aria-labelledby="practical-heading">
      <div className="page-width">
        <div className="practical-head">
          <p className="eyebrow">{t.eyebrow}</p>
          <h2 id="practical-heading">{t.title[0]} <em>{t.title[1]}</em></h2>
          <p className="practical-lead">{t.location}</p>
        </div>

        <div className="practical-grid">
          <div>
            <h3>{t.ratesTitle}</h3>
            <p>{t.ratesIntro}</p>
            <div className="practical-table-wrap">
              <table className="practical-table">
                <thead><tr>{t.columns.map((column) => <th key={column} scope="col">{column}</th>)}</tr></thead>
                <tbody>{suites[lang].map((suite) => {
                  const detail = suiteDetails[lang][suite.id]
                  const rate = RATES[suite.id]
                  return <tr key={suite.id}>
                    <th scope="row"><Link to={suitePaths(suite.id)[lang]}>{suite.label}</Link></th>
                    <td>{detail.surface}</td>
                    <td>{rate.maxGuests}</td>
                    <td>{formatEuros(rate.night, locale)}{rate.breakfastIncluded && <small className="practical-breakfast">{ui[lang].suitePage.breakfastOffered}</small>}</td>
                    <td>{nightsLabel(lang, rate.minNights ?? MIN_NIGHTS)}</td>
                  </tr>
                })}</tbody>
              </table>
            </div>
          </div>
          <div>
            <h3>{t.stepsTitle}</h3>
            <ol className="practical-steps">{t.steps.map((step) => <li key={step}>{step}</li>)}</ol>
            <button type="button" className="button button-burgundy practical-book" onClick={onBook}>{t.bookCta} <ArrowRight size={17} /></button>
            <a className="text-link" href={spaUrl('infos', lang)} target="_blank" rel="noopener">{t.spaLink}<ArrowUpRight size={16} strokeWidth={1.25} /></a>
            <Link className="text-link" to={guidesIndexPaths[lang]}>{t.guidesLink}<ArrowUpRight size={16} strokeWidth={1.25} /></Link>
          </div>
        </div>

        <h3 className="practical-faq-title">{t.faqTitle}</h3>
        <div className="practical-faq">{faqItems(lang).map((item, index) => <details key={item.q} open={index === 0}><summary>{item.q}<ArrowUpRight size={16} strokeWidth={1.25} aria-hidden="true" /></summary><p>{item.a}</p></details>)}</div>
      </div>
    </section>
  )
}
