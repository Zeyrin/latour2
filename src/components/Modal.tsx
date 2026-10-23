import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { useLang } from '../lib/i18n'
import { ui } from '../lib/ui'

interface ModalProps {
  children: ReactNode
  title: string
  onClose: () => void
  className?: string
}

export function Modal({ children, title, onClose, className = '' }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const lang = useLang()

  useEffect(() => {
    const dialog = ref.current
    const activeElement = document.activeElement as HTMLElement | null
    const previousOverflow = document.documentElement.style.overflow
    dialog?.showModal()
    document.documentElement.style.overflow = 'hidden'
    return () => {
      dialog?.close()
      document.documentElement.style.overflow = previousOverflow
      activeElement?.focus({ preventScroll: true })
    }
  }, [])

  return createPortal(
    <dialog
      ref={ref}
      className={`modal ${className}`}
      aria-label={title}
      onCancel={(event) => { event.preventDefault(); onClose() }}
      onClick={(event) => { if (event.target === event.currentTarget) onClose() }}
      data-lenis-prevent
    >
      <div className="modal-toolbar"><button className="icon-button modal-close" aria-label={ui[lang].close} onClick={onClose}><X size={22} strokeWidth={1.25} /></button></div>
      <div className="modal-surface">
        {children}
      </div>
    </dialog>,
    document.body,
  )
}
