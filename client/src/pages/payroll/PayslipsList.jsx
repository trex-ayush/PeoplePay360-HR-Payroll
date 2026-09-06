import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Printer, Search } from 'lucide-react'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge, Button, DataTable, EmptyState, Input } from '@/components/ui'
import { payslipsApi } from '@/api/hr'
import { usePageTitle } from '@/hooks/usePageTitle'
import { PAYSLIP_STATES } from '@/config/constants'

const money = (value) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
    .format(value ?? 0)

const day = (value) =>
  new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })

const lineAmount = (payslip, category) =>
  payslip.lines.filter((l) => l.category === category).reduce((total, l) => total + l.amount, 0)

const columns = ({ onPrint }) => [
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
  {
    key: 'warning',
    header: 'Warning',
    cell: (row) =>
      row.employee?.bankAccount ? (
        <span className="text-neutral-300 dark:text-neutral-600">—</span>
      ) : (
        <span
          title="No bank account on file, so this payslip cannot be paid out"
          className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400"
        >
          <AlertTriangle size={12} />
          A/C missing
        </span>
      ),
  },
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
    key: 'basic',
    header: 'Basic',
    align: 'right',
    cell: (row) => <span className="tabular-nums">{money(lineAmount(row, 'BASIC'))}</span>,
  },
  {
    key: 'gross',
    header: 'Gross',
    align: 'right',
    cell: (row) => <span className="tabular-nums">{money(row.grossAmount)}</span>,
  },
  {
    key: 'netAmount',
    header: 'Net',
    align: 'right',
    cell: (row) => <span className="font-medium tabular-nums">{money(row.netAmount)}</span>,
  },
  { key: 'structureName', header: 'Structure' },
  {
    key: 'state',
    header: 'Status',
    cell: (row) => {
      const meta = PAYSLIP_STATES.find((s) => s.value === row.state)
      return (
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge tone={meta?.tone ?? 'neutral'} size="sm">
            {meta?.label ?? row.state}
          </Badge>
          {row.emailedAt ? (
            <span className="text-[10px] uppercase tracking-wider text-neutral-400">emailed</span>
          ) : null}
        </div>
      )
    },
  },
  {
    key: 'pdf',
    header: '',
    width: 60,
    align: 'right',
    cell: (row) => (
      <span onClick={(e) => e.stopPropagation()} role="presentation">
        <Button size="sm" variant="ghost" iconLeft={<Printer size={13} />} onClick={() => onPrint(row._id)}>
          PDF
        </Button>
      </span>
    ),
  },
]

export default function PayslipsList() {
  usePageTitle('Payslips')
  const navigate = useNavigate()

  const [payslips, setPayslips] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)
  const [meta, setMeta] = useState(null)

  useEffect(() => {
    let cancelled = false
    const timer = setTimeout(() => {
      setLoading(true)
      payslipsApi
        .list({ search, page })
        .then(({ payslips, ...meta }) => {
          if (cancelled) return
          setPayslips(payslips)
          setMeta(meta)
        })
        .catch((err) => !cancelled && setError(err))
        .finally(() => !cancelled && setLoading(false))
    }, search ? 250 : 0)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [search, page])

  return (
    <PageContainer>
      <PageHeader
        title="Payslips"
        description="Every payslip generated so far, across payruns."
      />

      <div className="mb-4 max-w-sm">
        <Input
          placeholder="Search payslips…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          iconLeft={<Search size={16} />}
        />
      </div>

      <DataTable
        columns={columns({ onPrint: (id) => navigate(`/payslips/${id}/print`) })}
        rows={payslips}
        rowKey={(row) => row._id}
        loading={loading}
        error={error}
        onRowClick={(row) => navigate(`/payslips/${row._id}`)}
        rounded="lg"
        pagination={meta ? { ...meta, onPageChange: setPage } : undefined}
        emptyState={
          <EmptyState
            title={search ? `No payslips match “${search}”` : 'No payslips yet'}
            description="Compute a payrun and its payslips appear here."
          />
        }
      />
    </PageContainer>
  )
}
