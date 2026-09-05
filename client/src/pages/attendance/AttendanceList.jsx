import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge, Button, DataTable, DeleteConfirmModal, EmptyState, Input } from '@/components/ui'
import { RowActions } from '@/components/RowActions'
import { AttendanceDrawer } from './AttendanceDrawer'
import { attendanceApi } from '@/api/hr'
import { useAuth } from '@/context/AuthContext'
import { useNotify } from '@/context/NotificationContext'
import { usePageTitle } from '@/hooks/usePageTitle'
import { getErrorMessage } from '@/utils/errorUtils'
import { ATTENDANCE_STATUSES } from '@/config/constants'

const HR_ROLES = ['hr_manager', 'hr_payroll_user', 'hr_payroll_manager', 'admin']

const clock = (value) =>
  value ? new Date(value).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'

const day = (value) =>
  new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

const buildColumns = ({ canCorrect, onEdit, onDelete }) => [
  {
    key: 'employee',
    header: 'Employee',
    cell: (row) => (
      <div>
        <p className="font-medium">{row.employee?.name}</p>
        <p className="font-mono text-xs text-neutral-500">{row.employee?.code}</p>
      </div>
    ),
  },
  { key: 'date', header: 'Date', cell: (row) => day(row.date) },
  { key: 'checkIn', header: 'Check In', cell: (row) => clock(row.checkIn) },
  { key: 'checkOut', header: 'Check Out', cell: (row) => clock(row.checkOut) },
  {
    key: 'workedHours',
    header: 'Worked Hours',
    align: 'right',
    cell: (row) => (
      <div className="tabular-nums">
        <span>{row.workedHours}</span>
        {row.overtimeHours ? (
          <p className="text-xs text-blue-600 dark:text-blue-400">+{row.overtimeHours} OT</p>
        ) : row.shortHours ? (
          <p className="text-xs text-amber-600 dark:text-amber-400">-{row.shortHours} short</p>
        ) : null}
      </div>
    ),
  },
  {
    key: 'status',
    header: 'Status',
    cell: (row) => {
      const meta = ATTENDANCE_STATUSES.find((s) => s.value === row.status)
      return (
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge tone={meta?.tone ?? 'neutral'} size="sm">
            {meta?.label ?? row.status}
          </Badge>
          {row.manuallyEdited ? (
            <span className="text-[10px] uppercase tracking-wider text-neutral-400">edited</span>
          ) : null}
        </div>
      )
    },
  },
  {
    key: 'actions',
    header: '',
    width: 60,
    align: 'right',
    cell: (row) =>
      canCorrect ? <RowActions onEdit={() => onEdit(row)} onDelete={() => onDelete(row)} /> : null,
  },
]

export default function AttendanceList() {
  usePageTitle('Attendance')
  const notify = useNotify()
  const { user } = useAuth()

  const canCorrect = user.roles.some((role) => HR_ROLES.includes(role))

  const [records, setRecords] = useState([])
  const [range, setRange] = useState({ from: '', to: '' })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [openId, setOpenId] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    attendanceApi
      .list(range)
      .then(({ records }) => {
        if (cancelled) return
        setRecords(records)
        setError(null)
      })
      .catch((err) => !cancelled && setError(err))
      .finally(() => !cancelled && setLoading(false))

    return () => {
      cancelled = true
    }
  }, [range, reloadKey])

  const reload = () => setReloadKey((k) => k + 1)

  async function handleDelete() {
    try {
      await attendanceApi.remove(pendingDelete._id)
      notify.success('Record deleted')
      reload()
    } catch (err) {
      notify.error(getErrorMessage(err))
    }
  }

  return (
    <PageContainer>
      <PageHeader
        title="Attendance"
        description="Daily presence and exceptions. Employees mark their own from the home page; corrections are an HR action."
        actions={
          canCorrect ? (
            <Button iconLeft={<Plus size={16} />} onClick={() => setOpenId('new')}>
              New
            </Button>
          ) : null
        }
      />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="w-44">
          <Input
            label="From"
            type="date"
            value={range.from}
            onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
          />
        </div>
        <div className="w-44">
          <Input
            label="To"
            type="date"
            value={range.to}
            onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
          />
        </div>
        {range.from || range.to ? (
          <Button variant="ghost" size="sm" onClick={() => setRange({ from: '', to: '' })}>
            Clear
          </Button>
        ) : null}
      </div>

      <DataTable
        columns={buildColumns({
          canCorrect,
          onEdit: (row) => setOpenId(row._id),
          onDelete: setPendingDelete,
        })}
        rows={records}
        rowKey={(row) => row._id}
        loading={loading}
        error={error}
        onRowClick={(row) => setOpenId(row._id)}
        rounded="lg"
        emptyState={
          <EmptyState
            title="No attendance records"
            description="Check in from the home page and today's record appears here."
          />
        }
      />

      <DeleteConfirmModal
        isOpen={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={handleDelete}
        title="Delete attendance record?"
        description="The day goes back to having no record at all."
        confirmValue={pendingDelete?.employee?.name ?? ''}
      />

      {openId ? (
        <AttendanceDrawer
          recordId={openId}
          onClose={() => setOpenId(null)}
          onSaved={() => {
            if (openId === 'new') setOpenId(null)
            reload()
          }}
        />
      ) : null}
    </PageContainer>
  )
}
