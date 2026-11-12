import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, ArrowUpRight, X } from 'lucide-react'
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

      {open && <MomentDialog lang={lang} onClose={() => setOpen(false)} onBook={book} />}
    </>
  )
}

/** Fiche des événements : grande photo titrée, dates en pastilles ; volet depuis le bas sur mobile. */
function MomentDialog({ lang, onClose, onBook }: { lang: Lang; onClose: () => void; onBook: (universe: UniverseId, message?: string) => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const t = momentContent[lang]

  useEffect(() => {
    const dialog = ref.current
    const previousFocus = document.activeElement as HTMLElement | null
    const previousOverflow = document.documentElement.style.overflow
    dialog?.showModal()
    document.documentElement.style.overflow = 'hidden'
    return () => {
      dialog?.close()
      document.documentElement.style.overflow = previousOverflow
      previousFocus?.focus({ preventScroll: true })
    }
  }, [])

  return createPortal(
    <dialog
      ref={ref}
      className="moment-dialog"
      aria-labelledby="moment-dialog-title"
      onCancel={(event) => { event.preventDefault(); onClose() }}
      onClick={(event) => { if (event.target === event.currentTarget) onClose() }}
      data-lenis-prevent
    >
      <button className="moment-dialog-close" onClick={onClose} aria-label={t.close}><X size={18} strokeWidth={1.5} /></button>
      <div className="moment-dialog-hero">
        <Picture name={moment.image} alt={t.alt} sizes="(max-width: 700px) 100vw, 480px" />
        <div className="moment-dialog-hero-text">
          <span className="moment-dialog-pill"><span className="moment-dot" aria-hidden="true" />{t.eyebrow}</span>
          <h2 id="moment-dialog-title">{t.title[0]} <em>{t.title[1]}</em></h2>
          <p>{t.intro}</p>
        </div>
      </div>
      <div className="moment-dialog-body">
        <ul className="moment-cards">
          {t.events.map((event) => (
            <li key={event.id} className="moment-card">
              <div className="moment-days" aria-label={event.date || t.dateTbc}>
                {event.days.length ? event.days.map((day) => <span key={day.d + day.m} className="moment-day" aria-hidden="true"><strong>{day.d}</strong>{day.m}</span>) : <span className="moment-day is-tbc" aria-hidden="true"><strong>?</strong>{t.dateTbc}</span>}
              </div>
              <div className="moment-card-text">
                <p className="moment-card-label">{event.label}</p>
                <h3>{event.title}</h3>
                <p className="moment-card-date">{event.date || t.dateTbc}</p>
                <p>{event.text}</p>
                <button className="moment-chip-button" onClick={() => onBook('evenements', event.request)}>{event.cta}<ArrowUpRight size={15} strokeWidth={1.5} /></button>
              </div>
            </li>
          ))}
        </ul>
        <div className="moment-dialog-stay">
          <span>{t.stayNote[0]} <em>{t.stayNote[1]}</em></span>
          <button className="moment-stay-button" onClick={() => onBook('suites')}>{t.stayCta}<ArrowRight size={16} strokeWidth={1.5} /></button>
        </div>
      </div>
    </dialog>,
    document.body,
  )
}
