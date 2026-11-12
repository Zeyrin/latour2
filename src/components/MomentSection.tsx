import { motion } from 'framer-motion'
import { ArrowUpRight, CalendarDays } from 'lucide-react'
import { Picture } from './Picture'
import { isMomentVisible, moment, momentContent } from '../lib/moment'
import type { Lang } from '../lib/i18n'
import type { UniverseId } from '../lib/content'
import './MomentSection.css'

const reveal = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.08, margin: '0px 0px 80px 0px' },
  transition: { duration: 0.85, delay, ease: [0.22, 1, 0.36, 1] as const },
})

/** Section « En ce moment » : les événements à venir au château (contenu dans lib/moment.ts). */
export function MomentSection({ lang, onBook }: { lang: Lang; onBook: (universe?: UniverseId, message?: string) => void }) {
  // Vérifié à chaque rendu : au build (pré-rendu) et dans le navigateur, pour qu'elle disparaisse à la date prévue.
  if (!isMomentVisible()) return null
  const t = momentContent[lang]

  return (
    <section className="moment-section" id="en-ce-moment" aria-labelledby="moment-heading">
      <div className="page-width">
        <motion.div className="moment-heading" {...reveal()}>
          <div><p className="eyebrow">{t.eyebrow}</p><h2 id="moment-heading">{t.title[0]} <em>{t.title[1]}</em></h2></div>
          <p className="moment-intro">{t.intro}</p>
        </motion.div>
        <motion.div className="moment-visual" {...reveal(0.08)}>
          <Picture name={moment.image} alt={t.alt} sizes="(max-width: 1440px) 100vw, 1312px" />
          <span className="moment-badge"><span className="moment-dot" aria-hidden="true" />{t.badge}</span>
        </motion.div>
        <ul className="moment-events">
          {t.events.map((event, index) => (
            <motion.li key={event.id} className="moment-event" {...reveal(0.1 + index * 0.1)}>
              <p className="eyebrow moment-label">{event.label}</p>
              <h3>{event.title}</h3>
              <p className={`moment-date${event.date ? '' : ' is-tbc'}`}><CalendarDays size={15} strokeWidth={1.25} aria-hidden="true" />{event.date || t.dateTbc}</p>
              <p className="moment-text">{event.text}</p>
              <button className="text-link moment-cta" onClick={() => onBook('evenements', event.request)}>{event.cta}<ArrowUpRight size={16} strokeWidth={1.25} /></button>
            </motion.li>
          ))}
        </ul>
        <motion.div className="moment-stay" {...reveal()}>
          <span>{t.stayNote[0]} <em>{t.stayNote[1]}</em></span>
          <button className="button moment-stay-button" onClick={() => onBook('suites')}>{t.stayCta}<ArrowUpRight size={15} strokeWidth={1.5} /></button>
        </motion.div>
      </div>
    </section>
  )
}
