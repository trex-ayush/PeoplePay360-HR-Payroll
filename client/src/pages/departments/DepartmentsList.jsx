import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button, DataTable, EmptyState, Input } from '@/components/ui'
import { departmentsApi } from '@/api/hr'
import { useNotify } from '@/context/NotificationContext'
import { usePageTitle } from '@/hooks/usePageTitle'
import { getErrorMessage } from '@/utils/errorUtils'

const columns = [
  {
    key: 'name',
    header: 'Department',
    sortable: true,
    compare: (a, b) => a.name.localeCompare(b.name),
    cell: (row) => <span className="font-medium">{row.name}</span>,
  },
  { key: 'code', header: 'Code', cell: (row) => row.code || '—' },
]

export default function DepartmentsList() {
  usePageTitle('Departments')
  const notify = useNotify()

  const [departments, setDepartments] = useState([])
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

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
      await departmentsApi.create({ name: name.trim() })
      setName('')
      notify.success('Department added')
      await load()
    } catch (err) {
      notify.error(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <PageContainer maxWidth="md">
      <PageHeader title="Departments" description="Used to group employees and split payroll cost." />

      <form onSubmit={handleAdd} className="mb-4 flex items-end gap-2">
        <div className="max-w-xs flex-1">
          <Input
            label="New department"
            placeholder="Engineering"
            value={name}
            onChange={(e) => setName(e.target.value)}
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
    </PageContainer>
  )
}
