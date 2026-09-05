import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge, Button, DataTable, DeleteConfirmModal, EmptyState, Input } from '@/components/ui'
import { RowActions } from '@/components/RowActions'
import { PayrunWizard } from './PayrunWizard'
import { payrunsApi } from '@/api/hr'
import { useNotify } from '@/context/NotificationContext'
import { usePageTitle } from '@/hooks/usePageTitle'
import { getErrorMessage } from '@/utils/errorUtils'
import { PAYRUN_STATES } from '@/config/constants'

const money = (value) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
    .format(value ?? 0)

const day = (value) =>
  new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

const stateMeta = (value) => PAYRUN_STATES.find((s) => s.value === value)

const buildColumns = ({ onDelete }) => [
  {
    key: 'name',
    header: 'Payrun',
    sortable: true,
    compare: (a, b) => a.name.localeCompare(b.name),
    cell: (row) => (
      <div>
        <p className="font-medium">{row.name}</p>
        <p className="text-xs text-neutral-500">
          {day(row.periodStart)} — {day(row.periodEnd)}
        </p>
      </div>
    ),
  },
  {
    key: 'structure',
    header: 'Salary Structure',
    cell: (row) => row.structure?.name ?? '—',
  },
  {
    key: 'employeeCount',
    header: 'Employees',
    align: 'right',
    cell: (row) => <span className="tabular-nums">{row.employeeCount}</span>,
  },
  {
    key: 'netAmount',
    header: 'Net Total',
    align: 'right',
    cell: (row) => (
      <span className="tabular-nums">{row.payslips ? money(row.netAmount) : '—'}</span>
    ),
  },
  {
    key: 'state',
    header: 'Status',
    cell: (row) => {
      const meta = stateMeta(row.state)
      return (
        <Badge tone={meta?.tone ?? 'neutral'} size="sm" dot={row.state === 'validated'}>
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
      row.state === 'validated' || row.state === 'paid' ? null : (
        <RowActions onDelete={() => onDelete(row)} />
      ),
  },
]

export default function PayrunsList() {
  usePageTitle('Pay Runs')
  const navigate = useNavigate()
  const notify = useNotify()

  const [payruns, setPayruns] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [wizardOpen, setWizardOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const { payruns } = await payrunsApi.list({ search })
        if (!cancelled) {
          setPayruns(payruns)
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
      const { payslipsDeleted } = await payrunsApi.remove(pendingDelete._id)
      notify.success(
        payslipsDeleted
          ? `${pendingDelete.name} deleted · ${payslipsDeleted} payslips removed with it`
          : `${pendingDelete.name} deleted`
      )
      setReloadKey((k) => k + 1)
    } catch (err) {
      notify.error(getErrorMessage(err))
    }
  }

  return (
    <PageContainer>
      <PageHeader
        title="Pay Runs"
        description="A payrun groups the payslips for one payroll period. New opens a setup wizard — the batch is created only after you pick its employees."
        actions={
          <Button iconLeft={<Plus size={16} />} onClick={() => setWizardOpen(true)}>
            New
          </Button>
        }
      />

      <div className="mb-4 max-w-sm">
        <Input
          placeholder="Search payruns…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          iconLeft={<Search size={16} />}
        />
      </div>

      <DataTable
        columns={buildColumns({ onDelete: setPendingDelete })}
        rows={payruns}
        rowKey={(row) => row._id}
        loading={loading}
        error={error}
        onRowClick={(row) => navigate(`/payruns/${row._id}`)}
        rounded="lg"
        emptyState={
          <EmptyState
            title={search ? `No payruns match “${search}”` : 'No payruns yet'}
            description="Start one for a period and the employees whose contracts run on the chosen structure."
          />
        }
      />

      <DeleteConfirmModal
        isOpen={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={handleDelete}
        title="Delete payrun?"
        description="Its payslips go with it. A validated or paid payrun cannot be deleted."
        confirmValue={pendingDelete?.name ?? ''}
      />

      {wizardOpen ? (
        <PayrunWizard
          onClose={() => setWizardOpen(false)}
          onCreated={(payrun) => {
            setWizardOpen(false)
            navigate(`/payruns/${payrun._id}`)
          }}
        />
      ) : null}
    </PageContainer>
  )
}
