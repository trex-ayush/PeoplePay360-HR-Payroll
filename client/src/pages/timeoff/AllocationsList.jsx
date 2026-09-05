import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge, Button, DataTable, DeleteConfirmModal, EmptyState } from '@/components/ui'
import { RowActions } from '@/components/RowActions'
import { AllocationDrawer } from './AllocationDrawer'
import { allocationsApi } from '@/api/hr'
import { useNotify } from '@/context/NotificationContext'
import { usePageTitle } from '@/hooks/usePageTitle'
import { getErrorMessage } from '@/utils/errorUtils'
import { ALLOCATION_STATES } from '@/config/constants'

const amount = (value, unit) => `${value} ${unit ?? 'days'}`

const buildColumns = ({ onEdit, onDelete }) => [
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
    key: 'remaining',
    header: 'Remaining',
    align: 'right',
    cell: (row) => (
      <span className="font-medium tabular-nums">{amount(row.remaining, row.type?.unit)}</span>
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
    cell: (row) => <RowActions onEdit={() => onEdit(row)} onDelete={() => onDelete(row)} />,
  },
]

export default function AllocationsList() {
  usePageTitle('Allocations')
  const notify = useNotify()

  const [allocations, setAllocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [openId, setOpenId] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    allocationsApi
      .list()
      .then(({ allocations }) => {
        if (cancelled) return
        setAllocations(allocations)
        setError(null)
      })
      .catch((err) => !cancelled && setError(err))
      .finally(() => !cancelled && setLoading(false))

    return () => {
      cancelled = true
    }
  }, [reloadKey])

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
        description="Leave granted to an employee for a validity window. Only an approved allocation can be drawn from."
        actions={
          <Button iconLeft={<Plus size={16} />} onClick={() => setOpenId('new')}>
            New
          </Button>
        }
      />

      <DataTable
        columns={buildColumns({ onEdit: (row) => setOpenId(row._id), onDelete: setPendingDelete })}
        rows={allocations}
        rowKey={(row) => row._id}
        loading={loading}
        error={error}
        onRowClick={(row) => setOpenId(row._id)}
        rounded="lg"
        emptyState={
          <EmptyState
            title="No allocations yet"
            description="Grant a balance to an employee, approve it, and they can request leave against it."
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
