import { useState, type KeyboardEvent, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { addDays, addMonths, freeResource, isBooked, monthStart, type AvailabilityBlock } from '../lib/availability'
import { locales, useLang, type Lang } from '../lib/i18n'
import { bookingUi } from '../lib/ui'

interface AvailabilityCalendarProps {
  mode: 'range' | 'single'
  /** Une date est indisponible lorsque toutes ces ressources sont occupées. */
  resources: string[]
  blocks: AvailabilityBlock[]
  min: string
  arrival: string
  departure: string
  onChange: (arrival: string, departure: string) => void
}

const MONTHS_AHEAD = 18

function longDate(iso: string, lang: Lang) {
  return new Intl.DateTimeFormat(locales[lang], { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${iso}T12:00:00Z`))
}

function Month({ start, children }: { start: string; children: (day: string) => ReactNode }) {
  const lang = useLang()
  const { weekdays, weekdayNames } = bookingUi[lang]
  const first = new Date(`${start}T12:00:00Z`)
  const offset = (first.getUTCDay() + 6) % 7
  const length = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate()
  const cells = [...Array(offset).fill(''), ...Array.from({ length }, (_, index) => addDays(start, index))]
  const title = new Intl.DateTimeFormat(locales[lang], { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(first)
  return <div className="calendar-month">
    <p className="calendar-month-title" id={`month-${start}`}>{title}</p>
    <div className="calendar-grid" role="group" aria-labelledby={`month-${start}`}>
      {weekdays.map((day, index) => <abbr key={day} title={weekdayNames[index]} className="calendar-weekday">{day}</abbr>)}
      {cells.map((day, index) => day ? <span key={day}>{children(day)}</span> : <span key={`empty-${index}`} aria-hidden="true" />)}
    </div>
  </div>
}

export function AvailabilityCalendar({ mode, resources, blocks, min, arrival, departure, onChange }: AvailabilityCalendarProps) {
  const lang = useLang()
  const t = bookingUi[lang]
  const [view, setView] = useState(() => monthStart(arrival || min))
  const firstMonth = monthStart(min)
  const lastMonth = addMonths(firstMonth, MONTHS_AHEAD - 1)
  const max = addDays(addMonths(lastMonth, 2), -1)
  const choosingDeparture = mode === 'range' && Boolean(arrival) && !departure
  const nightBlocked = (day: string) => resources.every((resource) => isBooked(blocks, resource, day))
  const validDeparture = (day: string) => choosingDeparture && day > arrival && Boolean(freeResource(blocks, resources, arrival, day))

  function select(day: string) {
    if (mode === 'single') return onChange(day === arrival ? '' : day, '')
    if (validDeparture(day)) return onChange(arrival, day)
    onChange(day, '')
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const current = (event.target as HTMLElement).dataset.date
    const moves: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }
    if (!current || !(event.key in moves)) return
    event.preventDefault()
    const target = addDays(current, moves[event.key])
    if (target < min || target > max) return
    const calendar = event.currentTarget
    const find = () => calendar.querySelector<HTMLButtonElement>(`[data-date="${target}"]`)
    const visible = find()
    if (visible && visible.offsetParent) return visible.focus()
    setView(monthStart(target))
    window.requestAnimationFrame(() => find()?.focus())
  }

  function renderDay(day: string) {
    const isArrival = day === arrival
    const isDeparture = day === departure
    const past = day < min
    const blocked = !past && !isDeparture && nightBlocked(day)
    const disabled = past || (blocked && !validDeparture(day))
    const inRange = Boolean(arrival && departure) && day > arrival && day < departure
    const status = past ? t.past : disabled ? t.unavailable : isArrival ? (mode === 'range' ? t.arrivalSelected : t.dateSelected) : isDeparture ? t.departureSelected : inRange ? t.inStay : t.available
    return <button
      type="button"
      data-date={day}
      className={['calendar-day', disabled && 'is-unavailable', blocked && !past && 'is-booked', (isArrival || isDeparture) && 'is-selected', inRange && 'is-in-range'].filter(Boolean).join(' ')}
      aria-disabled={disabled || undefined}
      aria-pressed={isArrival || isDeparture}
      aria-label={`${longDate(day, lang)}, ${status}`}
      onClick={() => { if (!disabled) select(day) }}
    >{Number(day.slice(8))}</button>
  }

  const hint = mode === 'single'
    ? t.hintSingle
    : !arrival ? t.hintArrival : !departure ? t.hintDeparture : t.hintDone

  return <div className="calendar" onKeyDown={onKeyDown}>
    <div className="calendar-toolbar">
      <button type="button" className="icon-button" aria-label={t.prevMonth} disabled={view <= firstMonth} onClick={() => setView(addMonths(view, -1))}><ChevronLeft size={18} strokeWidth={1.25} /></button>
      <p className="calendar-hint" aria-live="polite">{hint}</p>
      <button type="button" className="icon-button" aria-label={t.nextMonth} disabled={view >= lastMonth} onClick={() => setView(addMonths(view, 1))}><ChevronRight size={18} strokeWidth={1.25} /></button>
    </div>
    <div className="calendar-months">
      <Month start={view}>{renderDay}</Month>
      <div className="calendar-second"><Month start={addMonths(view, 1)}>{renderDay}</Month></div>
    </div>
    <div className="calendar-legend" aria-hidden="true"><span><i className="legend-free" />{t.legendFree}</span><span><i className="legend-booked" />{t.legendBooked}</span><span><i className="legend-selected" />{t.legendSelected}</span></div>
  </div>
}
