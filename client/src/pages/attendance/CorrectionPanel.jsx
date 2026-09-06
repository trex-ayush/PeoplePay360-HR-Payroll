import { useCallback, useEffect, useState } from 'react'
import { Check, PencilLine, X } from 'lucide-react'
import { Badge, Button, FormField, Input } from '@/components/ui'
import { attendanceApi } from '@/api/hr'
import { useNotify } from '@/context/NotificationContext'
import { getErrorMessage } from '@/utils/errorUtils'
import { REQUEST_STATES } from '@/config/constants'

const toLocalInput = (value) => {
  if (!value) return ''
  const d = new Date(value)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const clock = (value) =>
  value ? new Date(value).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'

export function CorrectionPanel({ record, canDecide, onApplied }) {
  const notify = useNotify()

  const [corrections, setCorrections] = useState([])
  const [asking, setAsking] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    checkIn: toLocalInput(record.checkIn),
    checkOut: toLocalInput(record.checkOut),
    reason: '',
  })

  const load = useCallback(() => {
    attendanceApi
      .corrections({ attendance: record._id })
      .then(({ corrections }) => setCorrections(corrections))
      .catch(() => setCorrections([]))
  }, [record._id])

  useEffect(() => {
    load()
  }, [load])

  const set = (field) => (event) =>
    setForm((current) => ({ ...current, [field]: event.target.value }))

  async function submit(event) {
    event.preventDefault()
    setSaving(true)
    try {
      await attendanceApi.requestCorrection(record._id, {
        checkIn: form.checkIn ? new Date(form.checkIn).toISOString() : null,
        checkOut: form.checkOut ? new Date(form.checkOut).toISOString() : null,
        reason: form.reason,
      })
      notify.success('Correction sent to HR')
      setAsking(false)
      load()
    } catch (err) {
      notify.error(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  async function decide(id, action) {
    try {
      await attendanceApi[action](id)
      notify.success(action === 'approveCorrection' ? 'Correction applied' : 'Correction refused')
      load()
      onApplied?.()
    } catch (err) {
      notify.error(getErrorMessage(err))
    }
  }

  const open = corrections.find((c) => c.state === 'draft')

  return (
    <div className="space-y-3">
      <p className="text-xs uppercase tracking-wider text-neutral-500">Corrections</p>

      {corrections.map((correction) => {
        const meta = REQUEST_STATES.find((s) => s.value === correction.state)

        return (
          <div
            key={correction._id}
            className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-700"
          >
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={meta?.tone ?? 'neutral'} size="sm">
                {meta?.label ?? correction.state}
              </Badge>
              <span className="text-xs text-neutral-500">
                {clock(correction.previousCheckIn)} — {clock(correction.previousCheckOut)} →{' '}
                <span className="font-medium text-neutral-700 dark:text-neutral-200">
                  {clock(correction.checkIn ?? correction.previousCheckIn)} —{' '}
                  {clock(correction.checkOut ?? correction.previousCheckOut)}
                </span>
              </span>
            </div>

            <p className="mt-1.5 text-sm">{correction.reason}</p>

            {correction.approver ? (
              <p className="mt-1 text-xs text-neutral-500">
                Decided by {correction.approver.name}
              </p>
            ) : null}

            {canDecide && correction.state === 'draft' ? (
              <div className="mt-2 flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  iconLeft={<X size={13} />}
                  onClick={() => decide(correction._id, 'refuseCorrection')}
                >
                  Refuse
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  iconLeft={<Check size={13} />}
                  onClick={() => decide(correction._id, 'approveCorrection')}
                >
                  Approve
                </Button>
              </div>
            ) : null}
          </div>
        )
      })}

      {open || canDecide ? null : asking ? (
        <form onSubmit={submit} className="space-y-3 rounded-lg border border-neutral-200 p-3 dark:border-neutral-700">
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Check In" htmlFor="fixIn">
              <Input id="fixIn" type="datetime-local" value={form.checkIn} onChange={set('checkIn')} />
            </FormField>
            <FormField label="Check Out" htmlFor="fixOut">
              <Input
                id="fixOut"
                type="datetime-local"
                value={form.checkOut}
                onChange={set('checkOut')}
              />
            </FormField>
          </div>

          <FormField label="Why" htmlFor="reason" required hint="HR reads this before deciding">
            <Input
              id="reason"
              placeholder="Forgot to check out, left at 6pm"
              value={form.reason}
              onChange={set('reason')}
              required
            />
          </FormField>

          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => setAsking(false)}>
              Cancel
            </Button>
            <Button size="sm" type="submit" loading={saving}>
              Send to HR
            </Button>
          </div>
        </form>
      ) : (
        <Button
          size="sm"
          variant="secondary"
          iconLeft={<PencilLine size={13} />}
          onClick={() => setAsking(true)}
        >
          Request a correction
        </Button>
      )}
    </div>
  )
}
