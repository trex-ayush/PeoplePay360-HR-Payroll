import { useEffect, useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge, Button, DataTable, EmptyState, Input } from '@/components/ui'
import { ScheduleDrawer } from './ScheduleDrawer'
import { schedulesApi } from '@/api/hr'
import { usePageTitle } from '@/hooks/usePageTitle'
import { SCHEDULE_TYPES } from '@/config/constants'

const columns = [
  {
    key: 'name',
    header: 'Schedule Name',
    sortable: true,
    compare: (a, b) => a.name.localeCompare(b.name),
    cell: (row) => <span className="font-medium">{row.name}</span>,
  },
  {
    key: 'type',
    header: 'Type',
    cell: (row) => SCHEDULE_TYPES.find((t) => t.value === row.type)?.label ?? row.type,
  },
  { key: 'daysPerWeek', header: 'Days / Week', align: 'right' },
  {
    key: 'weeklyHours',
    header: 'Hours / Week',
    align: 'right',
    cell: (row) => <span className="font-semibold tabular-nums">{row.weeklyHours}h</span>,
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
]

export default function SchedulesList() {
  usePageTitle('Working Schedules')

  const [schedules, setSchedules] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [openId, setOpenId] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const { schedules } = await schedulesApi.list({ search })
        if (!cancelled) {
          setSchedules(schedules)
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

  return (
    <PageContainer>
      <PageHeader
        title="Working Schedules"
        description="Weekly hours are computed from the day pattern, never entered by hand."
        actions={
          <Button
            iconLeft={<Plus size={16} />}
            onClick={() => setOpenId('new')}
          >
            New Schedule
          </Button>
        }
      />

      <div className="mb-4 max-w-sm">
        <Input
          placeholder="Search schedules…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          iconLeft={<Search size={16} />}
        />
      </div>

      <DataTable
        columns={columns}
        rows={schedules}
        rowKey={(row) => row._id}
        loading={loading}
        error={error}
        onRowClick={(row) => setOpenId(row._id)}
        rounded="lg"
        emptyState={
          <EmptyState
            title={search ? `No schedules match “${search}”` : 'No working schedules yet'}
            description="A schedule defines the weekly pattern used by attendance and payroll."
          />
        }
      />

      {openId ? (
        <ScheduleDrawer
          scheduleId={openId}
          onClose={() => setOpenId(null)}
          onSaved={() => {
            setOpenId(null)
            setReloadKey((k) => k + 1)
          }}
        />
      ) : null}
    </PageContainer>
  )
}
