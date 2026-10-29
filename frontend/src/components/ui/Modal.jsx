import React, { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

export default function Modal({ open, onClose, title, children, size = 'md' }) {
  const ref = useRef()

  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (e.key === 'Escape') onClose?.() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  const sizes = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-2xl' }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(27,35,40,0.4)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.() }}
    >
      <div
        ref={ref}
        className={`bg-surface border border-border-hairline rounded shadow-dropdown w-full ${sizes[size]} flex flex-col max-h-[90vh]`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {title && (
          <div className="flex items-center justify-between px-4 py-3 border-b border-border-hairline shrink-0">
            <span className="text-sm font-semibold text-ink">{title}</span>
            <button onClick={onClose} className="text-ink-secondary hover:text-ink rounded p-0.5" aria-label="Close">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        <div className="overflow-y-auto flex-1 p-4">{children}</div>
      </div>
    </div>
  )
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Confirm', danger = false }) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <p className="text-sm text-ink-secondary mb-4">{message}</p>
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="btn-ghost text-sm">Cancel</button>
        <button
          onClick={() => { onConfirm?.(); onClose?.() }}
          className={danger ? 'btn-danger text-sm' : 'btn-primary text-sm'}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  )
}

