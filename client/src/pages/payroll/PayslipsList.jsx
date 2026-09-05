import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge, DataTable, EmptyState } from '@/components/ui'
import { payslipsApi } from '@/api/hr'
import { usePageTitle } from '@/hooks/usePageTitle'
import { PAYSLIP_STATES } from '@/config/constants'

const money = (value) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
    .format(value ?? 0)

const day = (value) =>
  new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

const columns = [
  {
    key: 'employee',
    header: 'Employee',
    cell: (row) => (
      <div>
        <p className="font-medium">{row.employee?.name}</p>
        <p className="font-mono text-xs text-neutral-500">{row.employee?.code}</p>
      </div>
    ),
  },
  { key: 'structureName', header: 'Structure' },
  { key: 'payrun', header: 'Pay Run', cell: (row) => row.payrun?.name ?? '—' },
  {
    key: 'period',
    header: 'Period',
    cell: (row) => (
      <span className="text-xs text-neutral-500">
        {day(row.periodStart)} — {day(row.periodEnd)}
      </span>
    ),
  },
  {
    key: 'workedDays',
    header: 'Worked Days',
    align: 'right',
    cell: (row) => <span className="tabular-nums">{row.workedDays}</span>,
  },
  {
    key: 'netAmount',
    header: 'Net',
    align: 'right',
    cell: (row) => <span className="font-medium tabular-nums">{money(row.netAmount)}</span>,
  },
  {
    key: 'state',
    header: 'Status',
    cell: (row) => {
      const meta = PAYSLIP_STATES.find((s) => s.value === row.state)
      return (
        <Badge tone={meta?.tone ?? 'neutral'} size="sm">
          {meta?.label ?? row.state}
        </Badge>
      )
    },
  },
]

export default function PayslipsList() {
  usePageTitle('Payslips')
  const navigate = useNavigate()

  const [payslips, setPayslips] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    payslipsApi
      .list()
      .then(({ payslips }) => !cancelled && setPayslips(payslips))
      .catch((err) => !cancelled && setError(err))
      .finally(() => !cancelled && setLoading(false))

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <PageContainer>
      <PageHeader
        title="Payslips"
        description="Every payslip generated so far, across payruns."
      />

      <DataTable
        columns={columns}
        rows={payslips}
        rowKey={(row) => row._id}
        loading={loading}
        error={error}
        onRowClick={(row) => navigate(`/payslips/${row._id}`)}
        rounded="lg"
        emptyState={
          <EmptyState
            title="No payslips yet"
            description="Compute a payrun and its payslips appear here."
          />
        }
      />
    </PageContainer>
  )
}
