import { useCallback, useEffect, useState } from 'react'
import { Clock, LogIn, LogOut } from 'lucide-react'
import { Button, Dropdown } from '@/components/ui'
import { attendanceApi } from '@/api/hr'
import { useNotify } from '@/context/NotificationContext'
import { getErrorMessage } from '@/utils/errorUtils'
import { cn } from '@/utils/cn'

const clock = (value) =>
  new Date(value).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })

const elapsed = (hours) => {
  const total = Math.max(0, Math.round(hours * 60))
  return `${Math.floor(total / 60)}h${String(total % 60).padStart(2, '0')}`
}

// The mockup puts this in the navbar so a day can be marked from anywhere. The
// indicator is red until somebody is clocked in, then green.
export function AttendanceQuickAction() {
  const notify = useNotify()

  const [state, setState] = useState({ record: null, linked: true })
  const [busy, setBusy] = useState(false)
  const [now, setNow] = useState(() => Date.now())

  const load = useCallback(async () => {
    try {
      setState(await attendanceApi.today())
    } catch {
      setState({ record: null, linked: false })
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const { record, linked } = state
  const running = Boolean(record?.checkIn && !record?.checkOut)

  useEffect(() => {
    if (!running) return
    const timer = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(timer)
  }, [running])

  if (!linked) return null

  const worked = running ? (now - new Date(record.checkIn)) / 3600000 : (record?.workedHours ?? 0)

  async function mark(action) {
    setBusy(true)
    try {
      const { record } = await attendanceApi[action]()
      setState({ record, linked: true })
      notify.success(action === 'checkIn' ? `Checked in at ${clock(record.checkIn)}` : 'Checked out')
    } catch (err) {
      notify.error(getErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dropdown
      align="right"
      className="w-64"
      trigger={
        <span
          title={running ? 'Checked in' : 'Not checked in'}
          className="relative flex items-center rounded-xl p-2 text-neutral-600 transition-colors hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-neutral-700"
        >
          <Clock size={19} strokeWidth={1.75} />
          <span
            aria-hidden="true"
            className={cn(
              'absolute right-1.5 top-1.5 h-2 w-2 rounded-full ring-2 ring-white dark:ring-neutral-800',
              running ? 'bg-emerald-500' : 'bg-red-500'
            )}
          />
        </span>
      }
    >
      <div className="px-3 py-3" onClick={(e) => e.stopPropagation()} role="presentation">
        <p className="text-[10px] uppercase tracking-wider text-neutral-400">
          {running ? 'Checked in' : record?.checkOut ? 'Last spell' : 'Not started'}
        </p>

        <p className="mt-1 text-sm text-neutral-700 dark:text-neutral-200">
          {record?.checkIn ? clock(record.checkIn) : '—'}
          {record?.checkOut ? ` — ${clock(record.checkOut)}` : running ? ' — now' : ''}
        </p>

        <p className="mt-2 text-2xl font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
          {elapsed(worked)}
        </p>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">today</p>

        <Button
          className="mt-3 w-full"
          size="sm"
          variant={running ? 'secondary' : 'primary'}
          loading={busy}
          iconLeft={running ? <LogOut size={14} /> : <LogIn size={14} />}
          onClick={() => mark(running ? 'checkOut' : 'checkIn')}
        >
          {running ? 'Check Out' : record?.checkOut ? 'Check In Again' : 'Check In'}
        </Button>
      </div>
    </Dropdown>
  )
}
