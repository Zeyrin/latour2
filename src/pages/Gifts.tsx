import { useEffect, useState } from 'react'
import { ArrowRight, ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Picture } from '../components/Picture'
import { Seo } from '../components/Seo'
import { GIFT_URL, SITE_URL, contact } from '../lib/content'
import { giftPaths, giftText, spaGifts, stays, vouchers, type GiftOffer } from '../lib/gifts'
import { LangContext, locales, paths, type Lang } from '../lib/i18n'
import { ui } from '../lib/ui'
import { BookingModal, GuideFrame } from './Guide'
import type { SuiteId } from '../lib/content'
import '../guides.css'
import '../gifts.css'

const price = (euros: number, lang: Lang) => new Intl.NumberFormat(locales[lang], { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(euros)

/** Lien vers l'offre sur la boutique Secretbox (nouvelle fenêtre). */
function ShopLink({ offer, lang, className = 'text-link' }: { offer: GiftOffer; lang: Lang; className?: string }) {
  const label = `${giftText[lang].give} ${offer.text[lang].title}`
  return <a className={className} href={offer.url} target="_blank" rel="noopener" aria-label={`${label} ${ui[lang].newWindow}`}>{giftText[lang].give}<ArrowUpRight size={15} strokeWidth={1.25} /></a>
}

function OfferCard({ offer, lang }: { offer: GiftOffer; lang: Lang }) {
  const o = offer.text[lang]
  return (
    <li className="gift-card">
      <a className="gift-card-image" href={offer.url} target="_blank" rel="noopener" tabIndex={-1} aria-hidden="true"><Picture name={offer.image} alt="" sizes="(max-width: 700px) 100vw, 33vw" /></a>
      <p className="eyebrow">{o.facts}</p>
      <h3>{o.title}</h3>
      <p className="gift-card-text">{o.includes}</p>
      <p className="gift-card-bottom"><span className="gift-price">{offer.from && <small>{giftText[lang].from} </small>}{price(offer.price, lang)}</span><ShopLink offer={offer} lang={lang} /></p>
    </li>
  )
}

function OfferSection({ id, title, intro, offers, lang }: { id: string; title: string[]; intro: string; offers: GiftOffer[]; lang: Lang }) {
  return (
    <section className="gift-section page-width" id={id} aria-labelledby={`${id}-heading`}>
      <div className="gift-section-heading">
        <h2 id={`${id}-heading`}>{title[0]} <em>{title[1]}</em></h2>
        <p>{intro}</p>
      </div>
      <ul className={`gift-grid gift-grid-${offers.length}`}>{offers.map((offer) => <OfferCard key={offer.id} offer={offer} lang={lang} />)}</ul>
    </section>
  )
}

function jsonLd(lang: Lang) {
  const url = `${SITE_URL}${giftPaths[lang]}`
  const all = [...vouchers, ...stays, ...spaGifts]
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${url}#page`,
    url,
    name: giftText[lang].seoTitle,
    inLanguage: lang,
    isPartOf: { '@id': `${SITE_URL}/#website` },
    about: { '@id': `${SITE_URL}/#etablissement` },
    mainEntity: {
      '@type': 'OfferCatalog',
      name: giftText[lang].eyebrow,
      itemListElement: all.map((offer) => ({
        '@type': 'Offer',
        name: offer.text[lang].title,
        description: offer.text[lang].includes,
        url: offer.url,
        priceCurrency: 'EUR',
        ...(offer.from ? { priceSpecification: { '@type': 'PriceSpecification', minPrice: offer.price, priceCurrency: 'EUR' } } : { price: offer.price }),
        seller: { '@id': `${SITE_URL}/#etablissement` },
      })),
    },
  }
}

/** Cartes cadeaux et séjours à offrir (achat sur la boutique Secretbox pour l'instant). */
export function GiftsPage({ lang = 'fr' }: { lang?: Lang }) {
  const t = giftText[lang]
  const other: Lang = lang === 'fr' ? 'en' : 'fr'
  const [suite, setSuite] = useState<SuiteId | null>(null)
  const booking = { suite, open: (id: SuiteId) => setSuite(id), close: () => setSuite(null) }
  const [voucher, freeAmount] = vouchers

  useEffect(() => { window.scrollTo({ top: 0, left: 0, behavior: 'instant' }) }, [])

  return (
    <LangContext.Provider value={lang}>
      <div className="suite-page guide-page gift-page">
        <Seo lang={lang} page={giftPaths} title={t.seoTitle} description={t.seoDescription} image={`${SITE_URL}/images/noel-salle-a-manger.webp`}><script type="application/ld+json">{JSON.stringify(jsonLd(lang))}</script></Seo>
        <GuideFrame lang={lang} other={giftPaths[other]} back={{ to: paths.home[lang], label: t.home }} onBook={() => booking.open('terre')}>
          <main>
            <header className="guide-hero page-width">
              <nav className="suite-breadcrumb" aria-label={ui[lang].breadcrumbLabel}><ol><li><Link to={paths.home[lang]}>{t.home}</Link></li><li aria-current="page">{t.eyebrow}</li></ol></nav>
              <p className="eyebrow">{t.eyebrow}</p>
              <h1>{t.title[0]} <em>{t.title[1]}</em></h1>
              <p className="guide-lead">{t.lead}</p>
            </header>
            <figure className="guide-cover"><Picture name="noel-salle-a-manger" alt={t.coverAlt} priority sizes="100vw" /></figure>

            <section className="gift-vouchers page-width" aria-labelledby="cartes-heading">
              <div className="gift-vouchers-copy">
                <h2 id="cartes-heading">{t.vouchersTitle[0]} <em>{t.vouchersTitle[1]}</em></h2>
                <p>{t.vouchersText}</p>
              </div>
              <ul className="gift-voucher-list">
                {[voucher, freeAmount].map((offer) => (
                  <li key={offer.id}>
                    <span className="gift-voucher-name">{offer.text[lang].title}<small>{offer.text[lang].includes}</small></span>
                    <span className="gift-price">{offer.from && <small>{t.from} </small>}{price(offer.price, lang)}</span>
                    <ShopLink offer={offer} lang={lang} className="button button-burgundy" />
                  </li>
                ))}
              </ul>
            </section>

            <OfferSection id="sejours" title={t.staysTitle} intro={t.staysText} offers={stays} lang={lang} />
            <OfferSection id="spa" title={t.spaTitle} intro={t.spaText} offers={spaGifts} lang={lang} />

            <section className="gift-how" aria-labelledby="how-heading">
              <div className="page-width">
                <h2 id="how-heading">{t.howTitle}</h2>
                <ol className="gift-steps">{t.how.map((step, index) => <li key={step.title}><span>0{index + 1}</span><h3>{step.title}</h3><p>{step.text}</p></li>)}</ol>
                <p className="gift-terms">{t.terms} {t.shopNote}</p>
                <div className="gift-how-bottom">
                  <div><h3>{t.contactTitle}</h3><p>{t.contactText} <a href={`tel:${contact.phoneLink}`}>{contact.phone}</a> · <a href={`mailto:${contact.email}`}>{contact.email}</a></p></div>
                  <div className="gift-how-links">
                    <a className="text-link" href={GIFT_URL} target="_blank" rel="noopener" aria-label={`${t.allShop} ${ui[lang].newWindow}`}>{t.allShop}<ArrowUpRight size={15} strokeWidth={1.25} /></a>
                    <button className="text-link" onClick={() => booking.open('terre')}>{t.bookSelf}<ArrowRight size={15} strokeWidth={1.25} /></button>
                  </div>
                </div>
              </div>
            </section>
          </main>
        </GuideFrame>
        <BookingModal suite={booking.suite} lang={lang} onClose={booking.close} />
      </div>
    </LangContext.Provider>
  )
}

export const GiftsFr = () => <GiftsPage />
export const GiftsEn = () => <GiftsPage lang="en" />
