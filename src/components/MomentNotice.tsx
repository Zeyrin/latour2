import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, ArrowUpRight, CalendarDays, X } from 'lucide-react'
import { Modal } from './Modal'
import { Picture } from './Picture'
import { isMomentVisible, moment, momentContent } from '../lib/moment'
import type { Lang } from '../lib/i18n'
import type { UniverseId } from '../lib/content'
import './MomentNotice.css'

const storageKey = `moment-dismissed:${moment.id}`

function wasDismissed() {
  try { return window.localStorage.getItem(storageKey) === '1' } catch { return false }
}
function rememberDismissed() {
  try { window.localStorage.setItem(storageKey, '1') } catch { /* navigation privée : tant pis */ }
}

/**
 * « En ce moment » : petite notification en bas de l'écran, qui apparaît une fois
 * le haut de page dépassé, et ouvre une fiche avec les événements (contenu dans lib/moment.ts).
 */
export function MomentNotice({ lang, onBook }: { lang: Lang; onBook: (universe?: UniverseId, message?: string) => void }) {
  const [shown, setShown] = useState(false)
  const [open, setOpen] = useState(false)
  const t = momentContent[lang]

  useEffect(() => {
    if (!isMomentVisible() || wasDismissed()) return
    let timer = 0
    const check = () => {
      if (window.scrollY < window.innerHeight * 0.6) return
      window.removeEventListener('scroll', check)
      timer = window.setTimeout(() => setShown(true), moment.delay)
    }
    window.addEventListener('scroll', check, { passive: true })
    check()
    return () => { window.removeEventListener('scroll', check); window.clearTimeout(timer) }
  }, [])

  const dismiss = () => { setShown(false); rememberDismissed() }
  const openDetails = () => { setOpen(true); setShown(false); rememberDismissed() }
  const book = (universe: UniverseId, message?: string) => { setOpen(false); onBook(universe, message) }

  return (
    <>
      <AnimatePresence>
        {shown && (
          <motion.aside className="moment-notice" aria-label={t.eyebrow} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }} transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}>
            <button className="moment-notice-body" onClick={openDetails}>
              <span className="moment-notice-thumb"><Picture name={moment.image} alt="" sizes="96px" /></span>
              <span className="moment-notice-text">
                <span className="moment-notice-eyebrow"><span className="moment-dot" aria-hidden="true" />{t.eyebrow}</span>
                <strong>{t.notice.title}</strong>
                <span className="moment-notice-line">{t.notice.line}</span>
                <span className="moment-notice-open">{t.notice.open}<ArrowRight size={13} strokeWidth={1.5} /></span>
              </span>
            </button>
            <button className="moment-notice-close" onClick={dismiss} aria-label={t.notice.close}><X size={15} strokeWidth={1.5} /></button>
          </motion.aside>
        )}
      </AnimatePresence>

      {open && (
        <Modal title={t.notice.title} onClose={() => setOpen(false)} className="content-modal moment-modal">
          <div className="detail-image"><Picture name={moment.image} alt={t.alt} /></div>
          <div className="detail-body">
            <p className="eyebrow">{t.eyebrow}</p>
            <h2>{t.title[0]}<br /><em>{t.title[1]}</em></h2>
            <p>{t.intro}</p>
            <ul className="moment-events">
              {t.events.map((event) => (
                <li key={event.id} className="moment-event">
                  <p className="eyebrow">{event.label}</p>
                  <h3>{event.title}</h3>
                  <p className={`moment-date${event.date ? '' : ' is-tbc'}`}><CalendarDays size={15} strokeWidth={1.25} aria-hidden="true" />{event.date || t.dateTbc}</p>
                  <p className="moment-text">{event.text}</p>
                  <button className="text-link" onClick={() => book('evenements', event.request)}>{event.cta}<ArrowUpRight size={16} strokeWidth={1.25} /></button>
                </li>
              ))}
            </ul>
            <p className="detail-note">{t.stayNote[0]} {t.stayNote[1]}</p>
            <button className="button button-burgundy" onClick={() => book('suites')}>{t.stayCta} <ArrowRight size={17} /></button>
          </div>
        </Modal>
      )}
    </>
  )
}
