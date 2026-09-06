import { useEffect, useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { Avatar, Badge, Button, DataTable, EmptyState, Input } from '@/components/ui'
import { UserDrawer } from './UserDrawer'
import { usersApi } from '@/api/hr'
import { usePageTitle } from '@/hooks/usePageTitle'
import { useDrawerRoute } from '@/hooks/useDrawerRoute'
import { ROLE_LABELS } from '@/config/constants'

const ROLE_FILTERS = ['employee', 'hr_manager', 'hr_payroll_user', 'hr_payroll_manager', 'admin']

const columns = [
  {
    key: 'name',
    header: 'User',
    cell: (row) => (
      <div className="flex items-center gap-2.5">
        <Avatar name={row.name} size="sm" />
        <span className="font-medium">{row.name}</span>
      </div>
    ),
  },
  {
    key: 'employee',
    header: 'Employee',
    cell: (row) =>
      row.employeeId ? (
        <div>
          <p>{row.employeeId.name}</p>
          <p className="font-mono text-xs text-neutral-500">{row.employeeId.code}</p>
        </div>
      ) : (
        <span className="text-neutral-400">Not linked</span>
      ),
  },
  { key: 'email', header: 'Work Email' },
  {
    key: 'roles',
    header: 'Role',
    cell: (row) => (
      <div className="flex flex-wrap gap-1">
        {row.roles.map((role) => (
          <Badge key={role} tone="info" size="sm">
            {ROLE_LABELS[role] ?? role}
          </Badge>
        ))}
      </div>
    ),
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
]

export default function UsersList() {
  usePageTitle('User Management')

  const [users, setUsers] = useState([])
  const [search, setSearch] = useState('')
  const [role, setRole] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)
  const [meta, setMeta] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [openId, setOpenId] = useDrawerRoute('/users')

  useEffect(() => {
    let cancelled = false
    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const { users, ...meta } = await usersApi.list({ search, role, page })
        if (!cancelled) {
          setUsers(users)
          setMeta(meta)
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
  }, [search, role, page, reloadKey])

  return (
    <PageContainer>
      <PageHeader
        title="User Management"
        description="Accounts that can sign in. Each one is linked to an employee, and its roles decide which modules they see."
        actions={
          <Button iconLeft={<Plus size={16} />} onClick={() => setOpenId('new')}>
            New User
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="max-w-sm flex-1">
          <Input
            placeholder="Search users, employees or email…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            iconLeft={<Search size={16} />}
          />
        </div>

        <select
          value={role}
          onChange={(e) => {
            setRole(e.target.value)
            setPage(1)
          }}
          className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
        >
          <option value="">All roles</option>
          {ROLE_FILTERS.map((value) => (
            <option key={value} value={value}>
              {ROLE_LABELS[value]}
            </option>
          ))}
        </select>
      </div>

      <DataTable
        columns={columns}
        rows={users}
        rowKey={(row) => row._id}
        loading={loading}
        error={error}
        onRowClick={(row) => setOpenId(row._id)}
        rounded="lg"
        pagination={meta ? { ...meta, onPageChange: setPage } : undefined}
        emptyState={
          <EmptyState
            title={search ? `No users match “${search}”` : 'No users yet'}
            description="Create one to give an employee access to the workspace."
          />
        }
      />

      {openId ? (
        <UserDrawer
          userId={openId}
          onClose={() => setOpenId(null)}
          onSaved={() => {
            if (openId === 'new') setOpenId(null)
            setReloadKey((key) => key + 1)
          }}
        />
      ) : null}
    </PageContainer>
  )
}
