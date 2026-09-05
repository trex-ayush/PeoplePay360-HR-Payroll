import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Search, X } from 'lucide-react'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge, Button, DataTable, DeleteConfirmModal, EmptyState, Input } from '@/components/ui'
import { RowActions } from '@/components/RowActions'
import { contractsApi, employeesApi } from '@/api/hr'
import { usePageTitle } from '@/hooks/usePageTitle'
import { CONTRACT_STATES } from '@/config/constants'

const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString('en-IN', { dateStyle: 'medium' }) : '—'

const formatWage = (value) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
    .format(value ?? 0)

const stateMeta = (state) => CONTRACT_STATES.find((s) => s.value === state)

const buildColumns = ({ onEdit, onDelete }) => [
  {
    key: 'reference',
    header: 'Contract',
    sortable: true,
    compare: (a, b) => a.reference.localeCompare(b.reference),
    cell: (row) => (
      <span className="font-mono text-xs font-medium">{row.reference}</span>
    ),
  },
  { key: 'employee', header: 'Employee', cell: (row) => row.employee?.name ?? '—' },
  { key: 'startDate', header: 'Start', cell: (row) => formatDate(row.startDate) },
  {
    key: 'endDate',
    header: 'End',
    cell: (row) =>
      row.endDate ? (
        formatDate(row.endDate)
      ) : (
        <span className="text-neutral-400">—</span>
      ),
  },
  {
    key: 'wage',
    header: 'Wage / Month',
    align: 'right',
    cell: (row) => <span className="tabular-nums">{formatWage(row.wage)}</span>,
  },
  {
    key: 'state',
    header: 'Status',
    cell: (row) => {
      const meta = stateMeta(row.state)
      return (
        <Badge tone={meta?.tone ?? 'neutral'} size="sm" dot={row.state === 'running'}>
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
    cell: (row) => (
      <RowActions onEdit={() => onEdit(row)} onDelete={() => onDelete(row)} />
    ),
  },
]

export default function ContractsList() {
  usePageTitle('Contracts')
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const employeeId = params.get('employee')

  const [contracts, setContracts] = useState([])
  const [employee, setEmployee] = useState(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (!employeeId) {
      setEmployee(null)
      return
    }
    employeesApi
      .get(employeeId)
      .then(({ employee }) => setEmployee(employee))
      .catch(() => setEmployee(null))
  }, [employeeId])

  useEffect(() => {
    let cancelled = false
    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const { contracts } = await contractsApi.list({ employee: employeeId, search })
        if (!cancelled) {
          setContracts(contracts)
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
  }, [employeeId, search, reloadKey])

  async function handleDelete() {
    try {
      await contractsApi.remove(pendingDelete._id)
      notify.success(`${pendingDelete.reference} deleted`)
      setReloadKey((k) => k + 1)
    } catch (err) {
      notify.error(getErrorMessage(err))
    }
  }

  return (
    <PageContainer>
      <PageHeader
        title="Contracts"
        description="Contract history is kept. Payroll uses the running contract that covers the period."
        actions={
          <Button iconLeft={<Plus size={16} />} onClick={() => navigate('/contracts/new')}>
            New
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="max-w-sm flex-1">
          <Input
            placeholder="Search contract reference…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            iconLeft={<Search size={16} />}
          />
        </div>

        {employee ? (
          <button
            type="button"
            onClick={() => setParams({})}
            className="inline-flex items-center gap-1.5 rounded-full border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:border-neutral-400 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-200"
          >
            Filtered to {employee.name}
            <X size={13} />
          </button>
        ) : null}
      </div>

      <DataTable
        columns={buildColumns({
          onEdit: (row) => navigate(`/contracts/${row._id}`),
          onDelete: setPendingDelete,
        })}
        rows={contracts}
        rowKey={(row) => row._id}
        loading={loading}
        error={error}
        onRowClick={(row) => navigate(`/contracts/${row._id}`)}
        rounded="lg"
        emptyState={
          <EmptyState
            title={employee ? `No contracts for ${employee.name}` : 'No contracts yet'}
            description="A contract carries the wage and salary structure payroll reads from."
          />
        }
      />

      <DeleteConfirmModal
        isOpen={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={handleDelete}
        title="Delete contract?"
        description="The salary agreed in this contract stops being available to payroll for its period."
        confirmValue={pendingDelete?.reference ?? ''}
      />
    </PageContainer>
  )
}
