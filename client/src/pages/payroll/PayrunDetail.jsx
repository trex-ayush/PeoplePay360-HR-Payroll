import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { BadgeCheck, Calculator, Wallet } from 'lucide-react'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  ConfirmModal,
  DataTable,
  EmptyState,
  ErrorState,
  Skeleton,
} from '@/components/ui'
import { WarningsPanel } from '@/components/WarningsPanel'
import { payrunsApi } from '@/api/hr'
import { useNotify } from '@/context/NotificationContext'
import { usePageTitle } from '@/hooks/usePageTitle'
import { getErrorMessage } from '@/utils/errorUtils'
import { PAYRUN_STATES, PAYSLIP_STATES } from '@/config/constants'

const money = (value) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
    .format(value ?? 0)

const day = (value) =>
  new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

const lineAmount = (payslip, category) =>
  payslip.lines.filter((l) => l.category === category).reduce((total, l) => total + l.amount, 0)

const payslipColumns = [
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
    key: 'workedDays',
    header: 'Worked',
    align: 'right',
    cell: (row) => (
      <span className="tabular-nums">
        {row.workedDays} / {row.totalWorkingDays}
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
    key: 'net',
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

function Detail({ label, children }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-neutral-500">{label}</dt>
      <dd className="mt-1 font-medium text-neutral-900 dark:text-neutral-100">{children}</dd>
    </div>
  )
}

export default function PayrunDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const notify = useNotify()

  const [payrun, setPayrun] = useState(null)
  const [payslips, setPayslips] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [running, setRunning] = useState('')
  const [warnings, setWarnings] = useState([])
  const [warningsLoading, setWarningsLoading] = useState(true)
  const [confirmValidate, setConfirmValidate] = useState(false)

  usePageTitle(payrun?.name ?? 'Payrun')

  const load = useCallback(async () => {
    try {
      const [{ payrun, payslips }, { warnings }] = await Promise.all([
        payrunsApi.get(id),
        payrunsApi.warnings(id),
      ])
      setPayrun(payrun)
      setPayslips(payslips)
      setWarnings(warnings)
      setWarningsLoading(false)
      setError(null)
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  async function run(action, fn, done) {
    setRunning(action)
    try {
      const result = await fn(id)
      notify.success(done(result))
      await load()
    } catch (err) {
      notify.error(getErrorMessage(err))
    } finally {
      setRunning('')
    }
  }

  if (loading) {
    return (
      <PageContainer>
        <Skeleton height={40} className="mb-6" />
        <Skeleton height={180} className="mb-4" />
        <Skeleton height={240} />
      </PageContainer>
    )
  }

  if (error) {
    return (
      <PageContainer>
        <ErrorState description={getErrorMessage(error)} />
      </PageContainer>
    )
  }

  const meta = PAYRUN_STATES.find((s) => s.value === payrun.state)
  const locked = payrun.state === 'validated' || payrun.state === 'paid'
  const netTotal = payslips.reduce((total, p) => total + p.netAmount, 0)

  return (
    <PageContainer>
      <PageHeader
        title={payrun.name}
        description="Compute the payslips, review them, then validate and mark the batch paid."
        actions={
          <>
            <Button
              variant="secondary"
              iconLeft={<Calculator size={14} />}
              disabled={locked}
              loading={running === 'compute'}
              onClick={() =>
                run('compute', payrunsApi.compute, ({ computed, skipped }) =>
                  skipped.length
                    ? `${computed} payslips computed · ${skipped.length} skipped without a contract`
                    : `${computed} payslips computed`
                )
              }
            >
              Compute
            </Button>
            <Button
              variant="secondary"
              iconLeft={<BadgeCheck size={14} />}
              disabled={payrun.state !== 'computed'}
              loading={running === 'validate'}
              onClick={() =>
                warnings.length
                  ? setConfirmValidate(true)
                  : run('validate', payrunsApi.validate, () => 'Payrun validated')
              }
            >
              Validate
            </Button>
            <Button
              iconLeft={<Wallet size={14} />}
              disabled={payrun.state !== 'validated'}
              loading={running === 'markPaid'}
              onClick={() => run('markPaid', payrunsApi.markPaid, () => 'Payrun marked paid')}
            >
              Mark Paid
            </Button>
          </>
        }
      />

      <WarningsPanel warnings={warnings} loading={warningsLoading} />

      <Card className="mb-6">
        <CardBody>
          <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <Detail label="Name">{payrun.name}</Detail>
            <Detail label="Salary Structure">{payrun.structure?.name}</Detail>
            <Detail label="Period">
              {day(payrun.periodStart)} — {day(payrun.periodEnd)}
            </Detail>
            <Detail label="Status">
              <Badge tone={meta?.tone ?? 'neutral'} dot={payrun.state === 'validated'}>
                {meta?.label ?? payrun.state}
              </Badge>
            </Detail>
          </dl>
        </CardBody>
      </Card>

      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Payslips in this Payrun</h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {payrun.employees.length} employees in the batch
            </p>
          </div>
          {payslips.length ? (
            <div className="text-right">
              <p className="text-xs uppercase tracking-wider text-neutral-500">Net total</p>
              <p className="font-semibold tabular-nums">{money(netTotal)}</p>
            </div>
          ) : null}
        </CardHeader>
        <CardBody className="p-0">
          <DataTable
            columns={payslipColumns}
            rows={payslips}
            rowKey={(row) => row._id}
            onRowClick={(row) => navigate(`/payslips/${row._id}`)}
            emptyState={
              <EmptyState
                title="Nothing computed yet"
                description="Run Compute to generate a payslip for every employee in this batch."
              />
            }
          />
        </CardBody>
      </Card>

      <ConfirmModal
        isOpen={confirmValidate}
        onClose={() => setConfirmValidate(false)}
        onConfirm={() => run('validate', payrunsApi.validate, () => 'Payrun validated')}
        title="Validate with open warnings?"
        description={`${warnings.length} issues are still listed on this payrun. Validating locks it, and the payslips can no longer be recomputed.`}
        confirmLabel="Validate anyway"
      />
    </PageContainer>
  )
}
