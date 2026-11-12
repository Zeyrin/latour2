import { useRef, useState } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { suiteDetails, suitePhotos, suites, type Universe } from '../lib/content'
import { suitePaths, type Lang } from '../lib/i18n'
import { RATES, formatEuros } from '../lib/pricing'
import { payUi, ui } from '../lib/ui'

/**
 * Bloc « Se sentir ailleurs, se sentir chez soi » de l'accueil : le texte des suites et les cinq suites en photo.
 * Ordinateur : panneaux qui s'ouvrent au survol. Mobile : carrousel à faire glisser, avec indicateur de position.
 */
export function SuitesShowcase({ universe, lang }: { universe: Universe; lang: Lang }) {
  const [active, setActive] = useState(0)
  const [slide, setSlide] = useState(0)
  const track = useRef<HTMLDivElement>(null)
  const t = ui[lang]
  const list = suites[lang]
  const locale = lang === 'fr' ? 'fr-FR' : 'en-GB'

  function onScroll() {
    const el = track.current
    if (!el || !el.firstElementChild) return
    const step = (el.firstElementChild as HTMLElement).offsetWidth + 10
    setSlide(Math.min(list.length - 1, Math.max(0, Math.round(el.scrollLeft / step))))
  }

  return (
    <section className="showcase" id="suites" aria-labelledby="heading-suites">
      <div className="page-width" id="les-suites">
        <div className="showcase-head">
          <p className="showcase-pill"><span>{universe.number}</span>{universe.label}</p>
          <h2 id="heading-suites">{universe.heading[0]} <em>{universe.heading[1]}</em></h2>
          <div className="showcase-intro">
            <p>{universe.description} {universe.detail}</p>
            <ul>{universe.features.map((feature) => <li key={feature}>{feature}</li>)}</ul>
          </div>
        </div>

        <div className="showcase-track" ref={track} onScroll={onScroll}>
          {list.map((suite, index) => {
            const detail = suiteDetails[lang][suite.id]
            const cover = suitePhotos[suite.id][0]
            const price = payUi[lang].fromPerNight(formatEuros(RATES[suite.id].night, locale))
            return (
              <Link key={suite.id} to={suitePaths(suite.id)[lang]} className={`showcase-panel showcase-${suite.id}${active === index ? ' is-active' : ''}`} onMouseEnter={() => setActive(index)} onFocus={() => setActive(index)}>
                {cover && <img src={cover} alt="" loading="lazy" decoding="async" />}
                <span className="showcase-shade" />
                <span className="showcase-index">0{index + 1}</span>
                <span className="showcase-vertical" aria-hidden="true">{suite.label}</span>
                <span className="showcase-card">
                  <span className="showcase-tags"><span>{detail.surface}</span><span>{detail.guests}</span><span>{price}</span></span>
                  <span className="showcase-title"><h3>{suite.label}</h3><span className="showcase-go" aria-hidden="true"><ArrowUpRight size={20} strokeWidth={1.4} /></span></span>
                  <span className="showcase-tagline">{detail.tagline}</span>
                  <span className="sr-only">{t.seeSuite}</span>
                </span>
              </Link>
            )
          })}
        </div>

        <div className="showcase-progress" aria-hidden="true">
          <span className="showcase-count">0{slide + 1} <span>/ 0{list.length}</span></span>
          <span className="showcase-bars">{list.map((suite, index) => <span key={suite.id} className={index === slide ? 'is-on' : ''} />)}</span>
        </div>
      </div>
    </section>
  )
}
