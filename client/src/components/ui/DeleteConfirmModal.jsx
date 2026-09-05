import { useEffect, useState } from 'react'
import { Modal } from './Modal'
import { Button } from './Button'
import { Input } from './Input'

/**
 * Destructive confirmation that makes you type the record's name first, so a
 * stray click can never remove anything.
 */
export function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmValue,
  confirmLabel = 'Delete',
}) {
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (isOpen) setTyped('')
  }, [isOpen])

  const matches = typed.trim() === confirmValue

  const handleConfirm = async () => {
    if (!matches) return
    setBusy(true)
    try {
      await onConfirm()
      onClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={busy ? () => {} : onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleConfirm} loading={busy} disabled={!matches}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {description ? (
        <p className="text-sm text-neutral-600 dark:text-neutral-400">{description}</p>
      ) : null}

      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">This cannot be undone.</p>

      <div className="mt-4">
        <Input
          label={`Type ${confirmValue} to confirm`}
          autoFocus
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              handleConfirm()
            }
          }}
        />
      </div>
    </Modal>
  )
}
