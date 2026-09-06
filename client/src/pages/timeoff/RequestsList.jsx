import { useEffect, useState } from 'react'
import { Check, Plus, X } from 'lucide-react'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge, Button, DataTable, DeleteConfirmModal, EmptyState } from '@/components/ui'
import { RowActions } from '@/components/RowActions'
import { RequestDrawer } from './RequestDrawer'
import { timeOffRequestsApi } from '@/api/hr'
import { useAuth } from '@/context/AuthContext'
import { useNotify } from '@/context/NotificationContext'
import { usePageTitle } from '@/hooks/usePageTitle'
import { useDrawerRoute } from '@/hooks/useDrawerRoute'
import { useEmployeeFilter } from '@/hooks/useEmployeeFilter'
import { EmployeeFilterChip } from '@/components/EmployeeFilterChip'
import { getErrorMessage } from '@/utils/errorUtils'
import { REQUEST_STATES } from '@/config/constants'
import { inUnits } from '@/utils/units'

const shortDate = (value) =>
  new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })

const HR_ROLES = ['hr_manager', 'hr_payroll_user', 'hr_payroll_manager', 'admin']

const buildColumns = ({ canDecide, onDecide, onEdit, onDelete }) => [
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
  { key: 'type', header: 'Type', cell: (row) => row.type?.name ?? '—' },
  { key: 'dateFrom', header: 'Start', cell: (row) => shortDate(row.dateFrom) },
  { key: 'dateTo', header: 'End', cell: (row) => shortDate(row.dateTo) },
  {
    key: 'duration',
    header: 'Duration',
    align: 'right',
    cell: (row) => (
      <div className="tabular-nums">
        <span>{inUnits(row.duration, row.type?.unit)}</span>
        {row.unpaidDuration ? (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            {row.unpaidDuration} unpaid
          </p>
        ) : null}
      </div>
    ),
  },
  {
    key: 'state',
    header: 'Status',
    cell: (row) => {
      const meta = REQUEST_STATES.find((s) => s.value === row.state)
      return (
        <Badge tone={meta?.tone ?? 'neutral'} size="sm" dot={row.state === 'approved'}>
          {meta?.label ?? row.state}
        </Badge>
      )
    },
  },
  {
    key: 'decide',
    header: '',
    align: 'right',
    cell: (row) =>
      canDecide && row.state === 'draft' ? (
        <span onClick={(e) => e.stopPropagation()} role="presentation" className="flex justify-end gap-1">
          <Button
            size="sm"
            variant="ghost"
            iconLeft={<X size={13} />}
            onClick={() => onDecide(row, 'refuse')}
          >
            Refuse
          </Button>
          <Button
            size="sm"
            variant="secondary"
            iconLeft={<Check size={13} />}
            onClick={() => onDecide(row, 'approve')}
          >
            Approve
          </Button>
        </span>
      ) : null,
  },
  {
    key: 'actions',
    header: '',
    width: 60,
    align: 'right',
    cell: (row) => <RowActions onEdit={() => onEdit(row)} onDelete={() => onDelete(row)} />,
  },
]

export default function RequestsList() {
  usePageTitle('Time Off Requests')
  const notify = useNotify()
  const { user } = useAuth()

  const canDecide = user.roles.some((role) => HR_ROLES.includes(role))

  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [openId, setOpenId] = useDrawerRoute('/time-off/requests')
  const { employeeId, employee, clear } = useEmployeeFilter()
  const [team, setTeam] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [page, setPage] = useState(1)
  const [meta, setMeta] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    timeOffRequestsApi
      .list({ employee: employeeId, team: team || undefined, page })
      .then(({ requests, ...meta }) => {
        if (cancelled) return
        setRequests(requests)
        setMeta(meta)
        setError(null)
      })
      .catch((err) => !cancelled && setError(err))
      .finally(() => !cancelled && setLoading(false))

    return () => {
      cancelled = true
    }
  }, [employeeId, team, page, reloadKey])

  const reload = () => setReloadKey((k) => k + 1)

  async function decide(row, action) {
    try {
      const { request } = await timeOffRequestsApi[action](row._id)

      notify.success(
        request.unpaidDuration
          ? `${row.employee?.name} approved · ${request.paidDuration} paid, ${request.unpaidDuration} unpaid`
          : `${row.employee?.name}'s request ${action}d`
      )
      reload()
    } catch (err) {
      notify.error(getErrorMessage(err))
    }
  }

  async function handleDelete() {
    try {
      await timeOffRequestsApi.remove(pendingDelete._id)
      notify.success('Request deleted')
      reload()
    } catch (err) {
      notify.error(getErrorMessage(err))
    }
  }

  return (
    <PageContainer>
      <PageHeader
        title="Time Off Requests"
        description={
          canDecide
            ? 'Leave asked for by employees. Approving one draws its duration from the matching allocation.'
            : 'Your leave requests. HR reviews each one before it is approved.'
        }
        actions={
          <Button iconLeft={<Plus size={16} />} onClick={() => setOpenId('new')}>
            New
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        {canDecide ? (
          <Button
            variant={team ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => {
              setTeam((on) => !on)
              setPage(1)
            }}
          >
            My Team
          </Button>
        ) : null}

        <EmployeeFilterChip employee={employee} onClear={clear} />
      </div>

      <DataTable
        columns={buildColumns({
          canDecide,
          onDecide: decide,
          onEdit: (row) => setOpenId(row._id),
          onDelete: setPendingDelete,
        })}
        rows={requests}
        rowKey={(row) => row._id}
        loading={loading}
        error={error}
        onRowClick={(row) => setOpenId(row._id)}
        rounded="lg"
        pagination={meta ? { ...meta, onPageChange: setPage } : undefined}
        emptyState={
          <EmptyState
            title="No time off requests yet"
            description="Raise one for an employee and approve it against their allocated balance."
          />
        }
      />

      <DeleteConfirmModal
        isOpen={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={handleDelete}
        title="Delete time off request?"
        description="This removes the leave record entirely. To give the balance back instead, refuse it."
        confirmValue={pendingDelete?.employee?.name ?? ''}
      />

      {openId ? (
        <RequestDrawer
          requestId={openId}
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
