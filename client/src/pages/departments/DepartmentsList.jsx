import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button, DataTable, DeleteConfirmModal, EmptyState } from '@/components/ui'
import { RowActions } from '@/components/RowActions'
import { DepartmentDrawer } from './DepartmentDrawer'
import { departmentsApi } from '@/api/hr'
import { useNotify } from '@/context/NotificationContext'
import { usePageTitle } from '@/hooks/usePageTitle'
import { getErrorMessage } from '@/utils/errorUtils'

export default function DepartmentsList() {
  usePageTitle('Departments')
  const notify = useNotify()

  const [departments, setDepartments] = useState([])
  const [open, setOpen] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)

  const load = () =>
    departmentsApi
      .list()
      .then(({ departments }) => {
        setDepartments(departments)
        setError(null)
      })
      .catch(setError)
      .finally(() => setLoading(false))

  useEffect(() => {
    load()
  }, [])

  async function handleDelete() {
    try {
      await departmentsApi.remove(pendingDelete._id)
      notify.success(`${pendingDelete.name} deleted`)
      await load()
    } catch (err) {
      notify.error(getErrorMessage(err))
    }
  }

  const columns = [
    {
      key: 'name',
      header: 'Department',
      sortable: true,
      compare: (a, b) => a.name.localeCompare(b.name),
      cell: (row) => <span className="font-medium">{row.name}</span>,
    },
    { key: 'code', header: 'Code', cell: (row) => row.code || '—' },
    {
      key: 'actions',
      header: '',
      align: 'right',
      width: 60,
      cell: (row) => (
        <RowActions onEdit={() => setOpen(row)} onDelete={() => setPendingDelete(row)} />
      ),
    },
  ]

  return (
    <PageContainer>
      <PageHeader
        title="Departments"
        description="Used to group employees and split payroll cost."
        actions={
          <Button iconLeft={<Plus size={16} />} onClick={() => setOpen('new')}>
            New
          </Button>
        }
      />

      <DataTable
        columns={columns}
        rows={departments}
        rowKey={(row) => row._id}
        loading={loading}
        error={error}
        onRowClick={(row) => setOpen(row)}
        onRetry={load}
        rounded="lg"
        emptyState={
          <EmptyState
            title="No departments yet"
            description="Create one before assigning employees."
          />
        }
      />

      <DeleteConfirmModal
        isOpen={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={handleDelete}
        title="Delete department?"
        description="Employees or contracts still attached to it will block the delete."
        confirmValue={pendingDelete?.name ?? ''}
      />

      {open ? (
        <DepartmentDrawer
          department={open === 'new' ? null : open}
          onClose={() => setOpen(null)}
          onSaved={() => {
            if (open === 'new') setOpen(null)
            load()
          }}
        />
      ) : null}
    </PageContainer>
  )
}
