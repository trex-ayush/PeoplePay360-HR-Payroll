import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge, Button, DataTable, DeleteConfirmModal, EmptyState, Input } from '@/components/ui'
import { RowActions } from '@/components/RowActions'
import { StructureDrawer } from './StructureDrawer'
import { salaryStructuresApi } from '@/api/hr'
import { useNotify } from '@/context/NotificationContext'
import { usePageTitle } from '@/hooks/usePageTitle'
import { useDrawerRoute } from '@/hooks/useDrawerRoute'
import { getErrorMessage } from '@/utils/errorUtils'

const buildColumns = ({ onEdit, onDelete }) => [
  {
    key: 'name',
    header: 'Structure Name',
    sortable: true,
    compare: (a, b) => a.name.localeCompare(b.name),
    cell: (row) => (
      <div>
        <p className="font-medium">{row.name}</p>
        <p className="font-mono text-xs text-neutral-500">{row.code}</p>
      </div>
    ),
  },
  {
    key: 'rules',
    header: 'Rules',
    align: 'right',
    cell: (row) => (
      <span className="tabular-nums">
        {row.rules} rule{row.rules === 1 ? '' : 's'}
      </span>
    ),
  },
  {
    key: 'employees',
    header: 'Employees',
    align: 'right',
    cell: (row) => (
      <span className="tabular-nums">
        {row.employees} employee{row.employees === 1 ? '' : 's'}
      </span>
    ),
  },
  {
    key: 'active',
    header: 'Status',
    cell: (row) =>
      row.active ? (
        <Badge tone="success" size="sm" dot>
          Active
        </Badge>
      ) : (
        <Badge tone="neutral" size="sm">
          Inactive
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

export default function StructuresList() {
  usePageTitle('Salary Structures')
  const navigate = useNavigate()
  const notify = useNotify()

  const [structures, setStructures] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [openId, setOpenId] = useDrawerRoute('/salary-structures')

  useEffect(() => {
    let cancelled = false
    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const { structures } = await salaryStructuresApi.list({ search, active: 'all' })
        if (!cancelled) {
          setStructures(structures)
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

  async function handleDelete() {
    try {
      const { rulesDeleted } = await salaryStructuresApi.remove(pendingDelete._id)
      notify.success(
        rulesDeleted
          ? `${pendingDelete.name} deleted · ${rulesDeleted} rules removed with it`
          : `${pendingDelete.name} deleted`
      )
      setReloadKey((k) => k + 1)
    } catch (err) {
      notify.error(getErrorMessage(err))
    }
  }

  const open = (row) => navigate(`/salary-structures/${row._id}`)

  return (
    <PageContainer>
      <PageHeader
        title="Salary Structures"
        description="A structure groups the rules that calculate a payslip. The structure chosen on a payrun decides which rules run."
        actions={
          <Button
            iconLeft={<Plus size={16} />}
            onClick={() => setOpenId('new')}
          >
            New
          </Button>
        }
      />

      <div className="mb-4 max-w-sm">
        <Input
          placeholder="Search structures…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          iconLeft={<Search size={16} />}
        />
      </div>

      <DataTable
        columns={buildColumns({ onEdit: open, onDelete: setPendingDelete })}
        rows={structures}
        rowKey={(row) => row._id}
        loading={loading}
        error={error}
        onRowClick={open}
        rounded="lg"
        emptyState={
          <EmptyState
            title={search ? `No structures match “${search}”` : 'No salary structures yet'}
            description="Create one, then add the rules that build up a payslip."
          />
        }
      />

      <DeleteConfirmModal
        isOpen={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={handleDelete}
        title="Delete salary structure?"
        description="Its rules go with it. Contracts using this structure will block the delete."
        confirmValue={pendingDelete?.name ?? ''}
      />

      {openId === 'new' ? (
        <StructureDrawer
          structureId='new'
          onClose={() => setOpenId(null)}
          onSaved={(structure) => {
            setOpenId(null)
            navigate(`/salary-structures/${structure._id}`)
          }}
        />
      ) : null}
    </PageContainer>
  )
}
