import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { Printer } from 'lucide-react'
import { Badge, Button, Card, CardBody, CardHeader, ErrorState, Skeleton } from '@/components/ui'
import { payslipsApi } from '@/api/hr'
import { usePageTitle } from '@/hooks/usePageTitle'
import { getErrorMessage } from '@/utils/errorUtils'
import { PAYSLIP_STATES, RULE_CATEGORIES } from '@/config/constants'

const money = (value) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 })
    .format(value ?? 0)

const day = (value) =>
  new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

function Detail({ label, children }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-neutral-500">{label}</dt>
      <dd className="mt-1 font-medium text-neutral-900 dark:text-neutral-100">{children}</dd>
    </div>
  )
}

export default function PayslipDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [payslip, setPayslip] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  usePageTitle(payslip ? `Payslip · ${payslip.employee?.name}` : 'Payslip')

  useEffect(() => {
    let cancelled = false

    payslipsApi
      .get(id)
      .then(({ payslip }) => !cancelled && setPayslip(payslip))
      .catch((err) => !cancelled && setError(err))
      .finally(() => !cancelled && setLoading(false))

    return () => {
      cancelled = true
    }
  }, [id])

  if (loading) {
    return (
      <PageContainer>
        <Skeleton height={40} className="mb-6" />
        <Skeleton height={180} className="mb-4" />
        <Skeleton height={280} />
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

  const meta = PAYSLIP_STATES.find((s) => s.value === payslip.state)

  return (
    <PageContainer>
      <PageHeader
        title={`Payslip · ${payslip.employee?.name}`}
        description="Detailed salary computation for one employee."
        actions={
          <Button
            iconLeft={<Printer size={14} />}
            onClick={() => navigate(`/payslips/${id}/print`)}
          >
            Print Payslip
          </Button>
        }
      />

      <Card className="mb-6">
        <CardBody>
          <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <Detail label="Employee">
              {payslip.employee?.name}
              <span className="ml-2 font-mono text-xs font-normal text-neutral-500">
                {payslip.employee?.code}
              </span>
            </Detail>
            <Detail label="Salary Structure">{payslip.structureName}</Detail>
            <Detail label="Pay Run">
              <Link
                to={`/payruns/${payslip.payrun?._id}`}
                className="underline underline-offset-2 hover:text-neutral-600 dark:hover:text-neutral-300"
              >
                {payslip.payrun?.name}
              </Link>
            </Detail>
            <Detail label="Period">
              {day(payslip.periodStart)} — {day(payslip.periodEnd)}
            </Detail>
            <Detail label="Worked Days">
              <span className="tabular-nums">
                {payslip.workedDays} of {payslip.totalWorkingDays}
              </span>
            </Detail>
            <Detail label="Status">
              <Badge tone={meta?.tone ?? 'neutral'}>{meta?.label ?? payslip.state}</Badge>
            </Detail>
          </dl>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-semibold">Salary Computation</h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Computed on contract {payslip.contract?.reference} · wage {money(payslip.wage)}
          </p>
        </CardHeader>
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-neutral-200 text-left text-xs uppercase tracking-wider text-neutral-500 dark:border-neutral-700">
                <tr>
                  <th className="px-4 py-2 font-medium">Rule</th>
                  <th className="px-4 py-2 font-medium">Category</th>
                  <th className="px-4 py-2 font-medium">Code</th>
                  <th className="px-4 py-2 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                {payslip.lines.map((line) => {
                  const category = RULE_CATEGORIES.find((c) => c.value === line.category)
                  const total = line.category === 'GROSS' || line.category === 'NET'
                  return (
                    <tr key={line.code} className={total ? 'bg-neutral-50 dark:bg-neutral-800/60' : undefined}>
                      <td className={`px-4 py-2 ${total ? 'font-semibold' : ''}`}>{line.name}</td>
                      <td className="px-4 py-2">
                        <Badge tone={category?.tone ?? 'neutral'} size="sm">
                          {category?.label ?? line.category}
                        </Badge>
                      </td>
                      <td className="px-4 py-2 font-mono text-xs">{line.code}</td>
                      <td
                        className={`px-4 py-2 text-right tabular-nums ${
                          total ? 'font-semibold' : ''
                        } ${line.amount < 0 ? 'text-red-600 dark:text-red-400' : ''}`}
                      >
                        {money(line.amount)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </PageContainer>
  )
}
