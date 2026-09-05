import { useCallback, useEffect, useState } from 'react'
import { LogIn, LogOut } from 'lucide-react'
import { Badge, Button, ConfirmModal, Skeleton } from '@/components/ui'
import { attendanceApi } from '@/api/hr'
import { useAuth } from '@/context/AuthContext'
import { useNotify } from '@/context/NotificationContext'
import { getErrorMessage } from '@/utils/errorUtils'
import { ATTENDANCE_STATUSES } from '@/config/constants'

const clock = (value) =>
  new Date(value).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })

const duration = (hours) => {
  const total = Math.max(0, Math.round(hours * 60))
  return `${Math.floor(total / 60)}h${String(total % 60).padStart(2, '0')}`
}

// Marking attendance is a daily action, so it sits where everyone already is
// rather than behind a menu. The Attendance module is for reviewing and correcting.
export function AttendanceWidget() {
  const { user } = useAuth()
  const notify = useNotify()

  const [state, setState] = useState({ record: null, linked: true })
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [now, setNow] = useState(() => Date.now())

  const load = useCallback(async () => {
    try {
      setState(await attendanceApi.today())
    } catch {
      setState({ record: null, linked: true })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const { record, linked } = state
  const running = Boolean(record?.checkIn && !record?.checkOut)

  // Only tick while the clock is actually running.
  useEffect(() => {
    if (!running) return
    const timer = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(timer)
  }, [running])

  async function mark(action) {
    setConfirming(false)
    setBusy(true)
    try {
      const { record } = await attendanceApi[action]()
      setState({ record, linked: true })
      notify.success(action === 'checkIn' ? `Checked in at ${clock(record.checkIn)}` : `Checked out · ${duration(record.workedHours)} today`)
    } catch (err) {
      notify.error(getErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const elapsed = running ? (now - new Date(record.checkIn)) / 3600000 : (record?.workedHours ?? 0)
  const statusMeta = ATTENDANCE_STATUSES.find((s) => s.value === record?.status)

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-800">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            Welcome back, {user.name.split(' ')[0]}!
          </p>
          <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        {statusMeta ? (
          <Badge tone={statusMeta.tone} size="sm" dot={running}>
            {statusMeta.label}
          </Badge>
        ) : null}
      </div>

      {loading ? (
        <Skeleton height={72} className="mt-5" />
      ) : !linked ? (
        <p className="mt-5 text-sm text-neutral-500 dark:text-neutral-400">
          Your account is not linked to an employee record yet, so attendance cannot be marked.
        </p>
      ) : (
        <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-baseline gap-6">
            <div>
              <p className="text-xs uppercase tracking-wider text-neutral-500">
                {running ? 'Since' : record?.checkIn ? 'Checked in' : 'Not started'}
              </p>
              <p className="mt-0.5 font-medium tabular-nums">
                {record?.checkIn ? clock(record.checkIn) : '—'}
                {record?.checkOut ? ` — ${clock(record.checkOut)}` : running ? ' — now' : ''}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-neutral-500">Today</p>
              <p className="mt-0.5 text-2xl font-semibold tabular-nums">{duration(elapsed)}</p>
            </div>
          </div>

          {record?.checkOut ? (
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Checked out at {clock(record.checkOut)}
              {record.overtimeHours ? ` · ${duration(record.overtimeHours)} overtime` : ''}
              {record.shortHours ? ` · ${duration(record.shortHours)} short of the shift` : ''}
              <br />
              Ask HR to correct this day if the times are wrong.
            </p>
          ) : (
            <Button
              size="lg"
              variant={running ? 'secondary' : 'primary'}
              loading={busy}
              iconLeft={running ? <LogOut size={16} /> : <LogIn size={16} />}
              onClick={() => (running ? setConfirming(true) : mark('checkIn'))}
            >
              {running ? 'Check Out' : 'Check In'}
            </Button>
          )}
        </div>
      )}

      {/* Checking out ends the day and cannot be undone by the employee. */}
      <ConfirmModal
        isOpen={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={() => mark('checkOut')}
        title={`Check out at ${new Date(now).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}?`}
        description={`That closes today at ${duration(elapsed)}. Only HR can change the times afterwards.`}
        confirmLabel="Check out"
        confirmVariant="primary"
      />
    </div>
  )
}
