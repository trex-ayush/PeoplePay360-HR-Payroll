import { useEffect, useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge, Button, DataTable, DeleteConfirmModal, EmptyState, Input } from '@/components/ui'
import { RowActions } from '@/components/RowActions'
import { TypeDrawer } from './TypeDrawer'
import { timeOffTypesApi } from '@/api/hr'
import { useNotify } from '@/context/NotificationContext'
import { usePageTitle } from '@/hooks/usePageTitle'
import { getErrorMessage } from '@/utils/errorUtils'
import { TIMEOFF_UNITS } from '@/config/constants'

const buildColumns = ({ onEdit, onDelete }) => [
  {
    key: 'name',
    header: 'Type',
    sortable: true,
    compare: (a, b) => a.name.localeCompare(b.name),
    cell: (row) => <span className="font-medium">{row.name}</span>,
  },
  {
    key: 'unit',
    header: 'Unit',
    cell: (row) => TIMEOFF_UNITS.find((u) => u.value === row.unit)?.label ?? row.unit,
  },
  {
    key: 'requiresAllocation',
    header: 'Allocation',
    cell: (row) => (
      <Badge tone={row.requiresAllocation ? 'warning' : 'neutral'} size="sm">
        {row.requiresAllocation ? 'Required' : 'No'}
      </Badge>
    ),
  },
  {
    key: 'payrollCode',
    header: 'Payroll Code',
    cell: (row) => <span className="font-mono text-xs">{row.payrollCode || '—'}</span>,
  },
  {
    key: 'active',
    header: 'Status',
    cell: (row) => (
      <Badge tone={row.active ? 'success' : 'neutral'} size="sm" dot={row.active}>
        {row.active ? 'Active' : 'Inactive'}
      </Badge>
    ),
  },
  {
    key: 'actions',
    header: '',
    width: 60,
    align: 'right',
    cell: (row) => <RowActions onEdit={() => onEdit(row)} onDelete={() => onDelete(row)} />,
  },
]

export default function TypesList() {
  usePageTitle('Time Off Types')
  const notify = useNotify()

  const [types, setTypes] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [openId, setOpenId] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const { types } = await timeOffTypesApi.list({ search, active: 'all' })
        if (!cancelled) {
          setTypes(types)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) setError(err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, search ? 250 : 0)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [search, reloadKey])

  const reload = () => setReloadKey((k) => k + 1)

  async function handleDelete() {
    try {
      await timeOffTypesApi.remove(pendingDelete._id)
      notify.success(`${pendingDelete.name} deleted`)
      reload()
    } catch (err) {
      notify.error(getErrorMessage(err))
    }
  }

  return (
    <PageContainer>
      <PageHeader
        title="Time Off Types"
        description="Leave policies: how each type is measured, and whether it has to draw from an allocated balance."
        actions={
          <Button iconLeft={<Plus size={16} />} onClick={() => setOpenId('new')}>
            New
          </Button>
        }
      />

      <div className="mb-4 max-w-sm">
        <Input
          placeholder="Search time off types…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          iconLeft={<Search size={16} />}
        />
      </div>

      <DataTable
        columns={buildColumns({ onEdit: (row) => setOpenId(row._id), onDelete: setPendingDelete })}
        rows={types}
        rowKey={(row) => row._id}
        loading={loading}
        error={error}
        onRowClick={(row) => setOpenId(row._id)}
        rounded="lg"
        emptyState={
          <EmptyState
            title={search ? `No types match “${search}”` : 'No time off types yet'}
            description="Create one — Paid Time Off, Sick Leave, Comp Off — before allocating balances."
          />
        }
      />

      <DeleteConfirmModal
        isOpen={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={handleDelete}
        title="Delete time off type?"
        description="Allocations or requests still using this type will block the delete."
        confirmValue={pendingDelete?.name ?? ''}
      />

      {openId ? (
        <TypeDrawer
          typeId={openId}
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
