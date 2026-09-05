import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button, DataTable, DeleteConfirmModal, Drawer, EmptyState, Input } from '@/components/ui'
import { RowActions } from '@/components/RowActions'
import { departmentsApi } from '@/api/hr'
import { useNotify } from '@/context/NotificationContext'
import { usePageTitle } from '@/hooks/usePageTitle'
import { getErrorMessage } from '@/utils/errorUtils'

export default function DepartmentsList() {
  usePageTitle('Departments')
  const notify = useNotify()

  const [departments, setDepartments] = useState([])
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [editing, setEditing] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingEdit, setSavingEdit] = useState(false)
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

  async function handleAdd(e) {
    e.preventDefault()
    if (!name.trim()) return

    setSaving(true)
    try {
      await departmentsApi.create({ name: name.trim(), code: code.trim() })
      setName('')
      setCode('')
      notify.success('Department added')
      await load()
    } catch (err) {
      notify.error(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  async function handleEdit(e) {
    e.preventDefault()
    if (!editing.name.trim()) return

    setSavingEdit(true)
    try {
      await departmentsApi.update(editing.id, {
        name: editing.name.trim(),
        code: editing.code.trim(),
      })
      setEditing(null)
      notify.success('Department updated')
      await load()
    } catch (err) {
      notify.error(getErrorMessage(err))
    } finally {
      setSavingEdit(false)
    }
  }

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
        <RowActions
          onEdit={() => setEditing({ id: row._id, name: row.name, code: row.code || '' })}
          onDelete={() => setPendingDelete(row)}
        />
      ),
    },
  ]

  return (
    <PageContainer maxWidth="md">
      <PageHeader
        title="Departments"
        description="Used to group employees and split payroll cost."
      />

      <form onSubmit={handleAdd} className="mb-4 flex flex-wrap items-end gap-2">
        <div className="min-w-[200px] flex-1">
          <Input
            label="New department"
            placeholder="Engineering"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="w-32">
          <Input
            label="Code"
            placeholder="ENG"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
          />
        </div>
        <Button type="submit" loading={saving} iconLeft={<Plus size={16} />}>
          Add
        </Button>
      </form>

      <DataTable
        columns={columns}
        rows={departments}
        rowKey={(row) => row._id}
        loading={loading}
        error={error}
        onRetry={load}
        rounded="lg"
        emptyState={<EmptyState title="No departments yet" description="Add one above." />}
      />

      <Drawer
        isOpen={Boolean(editing)}
        onClose={() => setEditing(null)}
        size="sm"
        title="Edit department"
        description="Renaming does not affect employees already assigned."
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button type="submit" form="edit-department" loading={savingEdit}>
              Save changes
            </Button>
          </>
        }
      >
        {editing ? (
          <form id="edit-department" onSubmit={handleEdit} className="space-y-4">
            <Input
              label="Name"
              autoFocus
              value={editing.name}
              onChange={(e) => setEditing({ ...editing, name: e.target.value })}
            />
            <Input
              label="Code"
              placeholder="ENG"
              value={editing.code}
              onChange={(e) => setEditing({ ...editing, code: e.target.value.toUpperCase() })}
            />
          </form>
        ) : null}
      </Drawer>

      <DeleteConfirmModal
        isOpen={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={handleDelete}
        title="Delete department?"
        description="Employees or contracts still attached to it will block the delete."
        confirmValue={pendingDelete?.name ?? ''}
      />
    </PageContainer>
  )
}
