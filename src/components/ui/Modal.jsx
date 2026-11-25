import { useEffect } from 'react'
import { X } from 'lucide-react'
import './Modal.css'

export default function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  size = 'md',
}) {
  useEffect(() => {
    if (!open) return undefined

    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.()
    }

    document.addEventListener('keydown', onKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="nf-modal-root" role="presentation">
      <button
        type="button"
        className="nf-modal-backdrop"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        className={`nf-modal nf-modal--${size}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="nf-modal__header">
          <h2 className="nf-modal__title">{title}</h2>
          <button
            type="button"
            className="nf-modal__close"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <div className="nf-modal__body">{children}</div>
        {footer ? <div className="nf-modal__footer">{footer}</div> : null}
      </div>
    </div>
  )
}
