import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LayoutGrid, List as ListIcon, Plus, Search } from 'lucide-react'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import {
  Badge,
  Button,
  Card,
  DataTable,
  DeleteConfirmModal,
  EmptyState,
  Input,
  Skeleton,
} from '@/components/ui'
import { RowActions } from '@/components/RowActions'
import { employeesApi } from '@/api/hr'
import { useNotify } from '@/context/NotificationContext'
import { usePageTitle } from '@/hooks/usePageTitle'
import { getErrorMessage } from '@/utils/errorUtils'
import { cn } from '@/utils/cn'

const buildColumns = ({ onEdit, onDelete }) => [
  {
    key: 'name',
    header: 'Employee',
    sortable: true,
    compare: (a, b) => a.name.localeCompare(b.name),
    cell: (row) => (
      <div className="flex items-center gap-3">
        <Initials name={row.name} />
        <div className="min-w-0">
          <p className="font-medium truncate">{row.name}</p>
          <p className="text-xs text-neutral-500 font-mono">{row.code}</p>
        </div>
      </div>
    ),
  },
  { key: 'workEmail', header: 'Work Email', cell: (row) => row.workEmail },
  { key: 'jobPosition', header: 'Job Position', cell: (row) => row.jobPosition || '—' },
  { key: 'department', header: 'Department', cell: (row) => row.department?.name ?? '—' },
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
          Archived
        </Badge>
      ),
  },
  {
    key: 'actions',
    header: '',
    width: 60,
    align: 'right',
    cell: (row) => (
      <RowActions
        onEdit={() => onEdit(row)}
        onDelete={() => onDelete(row)}
      />
    ),
  },
]

function Initials({ name }) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase()

  return (
    <div className="w-9 h-9 flex-shrink-0 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center text-xs font-semibold text-neutral-700 dark:text-neutral-200">
      {initials}
    </div>
  )
}

function KanbanCard({ employee, onOpen, onDelete }) {
  return (
    <Card interactive onClick={onOpen} className="p-4">
      <div className="flex items-start gap-3">
        <Initials name={employee.name} />
        <div className="min-w-0 flex-1">
          <p className="font-medium truncate">{employee.name}</p>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 truncate">
            {employee.jobPosition || '—'}
          </p>
          <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400 truncate">
            {employee.department?.name ?? '—'}
          </p>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between">
        {employee.active ? (
          <Badge tone="success" size="sm" dot>
            Active
          </Badge>
        ) : (
          <Badge tone="neutral" size="sm">
            Archived
          </Badge>
        )}
        <RowActions
          onEdit={onOpen}
          onDelete={onDelete}
        />
      </div>
    </Card>
  )
}

function ViewToggle({ view, onChange }) {
  const options = [
    { value: 'kanban', label: 'Kanban', icon: LayoutGrid },
    { value: 'list', label: 'List', icon: ListIcon },
  ]

  return (
    <div className="inline-flex rounded-lg border border-neutral-300 dark:border-neutral-600 overflow-hidden">
      {options.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          onClick={() => onChange(value)}
          aria-pressed={view === value}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors',
            view === value
              ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900'
              : 'bg-white text-neutral-600 hover:bg-neutral-50 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700'
          )}
        >
          <Icon size={14} />
          {label}
        </button>
      ))}
    </div>
  )
}

export default function EmployeesList() {
  usePageTitle('Employees')
  const navigate = useNavigate()
  const notify = useNotify()

  const [view, setView] = useState('kanban')
  const [search, setSearch] = useState('')
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const { employees } = await employeesApi.list({
          search,
          active: 'all',
        })
        if (!cancelled) {
          setEmployees(employees)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err)
          notify.error(getErrorMessage(err))
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, search ? 250 : 0)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [search, notify, reloadKey])

  const openEmployee = (employee) => navigate(`/employees/${employee._id}`)

  async function handleDelete() {
    try {
      const { managerCleared } = await employeesApi.remove(pendingDelete._id)
      notify.success(
        managerCleared
          ? `${pendingDelete.name} deleted · ${managerCleared} employee${managerCleared > 1 ? 's' : ''} left without a manager`
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
        title="Employees"
        description="The hub for every HR record. Open one to reach its contracts, attendance and time off."
        actions={
          <>
            <ViewToggle view={view} onChange={setView} />
            <Button iconLeft={<Plus size={16} />} onClick={() => navigate('/employees/new')}>
              New
            </Button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-4">
        <div className="max-w-sm flex-1">
          <Input
            placeholder="Search employees…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            iconLeft={<Search size={16} />}
          />
        </div>
      </div>

      {view === 'list' ? (
        <DataTable
          columns={buildColumns({
            onEdit: openEmployee,
            onDelete: setPendingDelete,
          })}
          rows={employees}
          rowKey={(row) => row._id}
          loading={loading}
          error={error}
          onRowClick={openEmployee}
          onRetry={() => setSearch((s) => s)}
          rounded="lg"
          stickyHeader
          emptyState={
            <EmptyState
              title={search ? `No employees match “${search}”` : 'No employees yet'}
              description="Create one to get started."
            />
          }
        />
      ) : loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} height={132} rounded="lg" />
          ))}
        </div>
      ) : employees.length === 0 ? (
        <Card>
          <EmptyState
            title={search ? `No employees match “${search}”` : 'No employees yet'}
            description="Create one to get started."
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {employees.map((employee) => (
            <KanbanCard
              key={employee._id}
              employee={employee}
              onOpen={() => openEmployee(employee)}
              onDelete={() => setPendingDelete(employee)}
            />
          ))}
        </div>
      )}

      <DeleteConfirmModal
        isOpen={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={handleDelete}
        title="Delete employee?"
        description="Contracts attached to this employee will block the delete. Anyone reporting to them is simply left without a manager."
        confirmValue={pendingDelete?.name ?? ''}
      />
    </PageContainer>
  )
}
