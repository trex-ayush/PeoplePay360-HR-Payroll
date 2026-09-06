import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge, Button, DataTable, DeleteConfirmModal, EmptyState } from '@/components/ui'
import { RowActions } from '@/components/RowActions'
import { AllocationDrawer } from './AllocationDrawer'
import { allocationsApi } from '@/api/hr'
import { useAuth } from '@/context/AuthContext'
import { useNotify } from '@/context/NotificationContext'
import { usePageTitle } from '@/hooks/usePageTitle'
import { useDrawerRoute } from '@/hooks/useDrawerRoute'
import { useEmployeeFilter } from '@/hooks/useEmployeeFilter'
import { EmployeeFilterChip } from '@/components/EmployeeFilterChip'
import { getErrorMessage } from '@/utils/errorUtils'
import { ALLOCATION_STATES } from '@/config/constants'
import { inUnits } from '@/utils/units'

const HR_ROLES = ['hr_manager', 'hr_payroll_user', 'hr_payroll_manager', 'admin']

const amount = (value, unit) => inUnits(value, unit)

const buildColumns = ({ canManage, onEdit, onDelete }) => [
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
  {
    key: 'allocated',
    header: 'Allocated',
    align: 'right',
    cell: (row) => (
      <div className="tabular-nums">
        <span>{amount(row.accrued, row.type?.unit)}</span>
        {row.mode === 'accrual' ? (
          <p className="text-xs text-neutral-500">
            {row.accrualRate}/month, max {row.allocated}
          </p>
        ) : null}
      </div>
    ),
  },
  {
    key: 'taken',
    header: 'Taken',
    align: 'right',
    cell: (row) => <span className="tabular-nums">{amount(row.taken, row.type?.unit)}</span>,
  },
  {
    key: 'available',
    header: 'Available',
    align: 'right',
    cell: (row) => (
      <div className="tabular-nums">
        <span className="font-medium">{amount(row.available, row.type?.unit)}</span>
        {row.pending ? (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            {row.pending} awaiting approval
          </p>
        ) : null}
      </div>
    ),
  },
  {
    key: 'validity',
    header: 'Validity',
    cell: (row) => (
      <span className="text-xs text-neutral-500">
        {new Date(row.validFrom).toLocaleDateString('en-IN', { dateStyle: 'medium' })} —{' '}
        {new Date(row.validTo).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
      </span>
    ),
  },
  {
    key: 'state',
    header: 'Status',
    cell: (row) => {
      const meta = ALLOCATION_STATES.find((s) => s.value === row.state)
      return (
        <Badge tone={meta?.tone ?? 'neutral'} size="sm" dot={row.state === 'approved'}>
          {meta?.label ?? row.state}
        </Badge>
      )
    },
  },
  {
    key: 'actions',
    header: '',
    width: 60,
    align: 'right',
    cell: (row) =>
      canManage ? <RowActions onEdit={() => onEdit(row)} onDelete={() => onDelete(row)} /> : null,
  },
]

export default function AllocationsList() {
  usePageTitle('Allocations')
  const notify = useNotify()
  const { user } = useAuth()

  const canManage = user.roles.some((role) => HR_ROLES.includes(role))

  const [allocations, setAllocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [openId, setOpenId] = useDrawerRoute('/time-off/allocations')
  const { employeeId, employee, clear } = useEmployeeFilter()
  const [reloadKey, setReloadKey] = useState(0)
  const [page, setPage] = useState(1)
  const [meta, setMeta] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    allocationsApi
      .list({ employee: employeeId, page })
      .then(({ allocations, ...meta }) => {
        if (cancelled) return
        setAllocations(allocations)
        setMeta(meta)
        setError(null)
      })
      .catch((err) => !cancelled && setError(err))
      .finally(() => !cancelled && setLoading(false))

    return () => {
      cancelled = true
    }
  }, [employeeId, page, reloadKey])

  const reload = () => setReloadKey((k) => k + 1)

  async function handleDelete() {
    try {
      await allocationsApi.remove(pendingDelete._id)
      notify.success('Allocation deleted')
      reload()
    } catch (err) {
      notify.error(getErrorMessage(err))
    }
  }

  return (
    <PageContainer>
      <PageHeader
        title="Allocations"
        description={
          canManage
            ? 'Leave granted to an employee for a validity window. Only an approved allocation can be drawn from.'
            : 'Your leave balances. Remaining is what you can still request.'
        }
        actions={
          canManage ? (
            <Button iconLeft={<Plus size={16} />} onClick={() => setOpenId('new')}>
              New
            </Button>
          ) : null
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3 empty:mb-0">
        <EmployeeFilterChip employee={employee} onClear={clear} />
      </div>

      <DataTable
        columns={buildColumns({
          canManage,
          onEdit: (row) => setOpenId(row._id),
          onDelete: setPendingDelete,
        })}
        rows={allocations}
        rowKey={(row) => row._id}
        loading={loading}
        error={error}
        onRowClick={(row) => setOpenId(row._id)}
        rounded="lg"
        pagination={meta ? { ...meta, onPageChange: setPage } : undefined}
        emptyState={
          <EmptyState
            title={canManage ? 'No allocations yet' : 'No leave allocated to you yet'}
            description={
              canManage
                ? 'Grant a balance to an employee, approve it, and they can request leave against it.'
                : 'HR grants your balance. Until then there is nothing to draw leave from.'
            }
          />
        }
      />

      <DeleteConfirmModal
        isOpen={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={handleDelete}
        title="Delete allocation?"
        description="Approved requests drawing from this allocation will block the delete."
        confirmValue={pendingDelete?.employee?.name ?? ''}
      />

      {openId ? (
        <AllocationDrawer
          allocationId={openId}
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
