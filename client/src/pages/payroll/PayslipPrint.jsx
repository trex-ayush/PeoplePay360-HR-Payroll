import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Printer } from 'lucide-react'
import { Button, ErrorState, Skeleton } from '@/components/ui'
import { payslipsApi } from '@/api/hr'
import { usePageTitle } from '@/hooks/usePageTitle'
import { getErrorMessage } from '@/utils/errorUtils'
import { amountInWords } from '@/utils/numberToWords'
import { env } from '@/config/env'

const money = (value) =>
  new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
    Math.abs(value ?? 0)
  )

const day = (value) =>
  new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

function Field({ label, children }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-neutral-500">{label}</p>
      <p className="mt-0.5 text-sm font-medium">{children}</p>
    </div>
  )
}

export default function PayslipPrint() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [payslip, setPayslip] = useState(null)
  const [error, setError] = useState(null)

  usePageTitle('Payslip')

  useEffect(() => {
    let cancelled = false

    payslipsApi
      .get(id)
      .then(({ payslip }) => !cancelled && setPayslip(payslip))
      .catch((err) => !cancelled && setError(err))

    return () => {
      cancelled = true
    }
  }, [id])

  if (error) return <ErrorState description={getErrorMessage(error)} />
  if (!payslip) return <Skeleton height={400} className="m-8" />

  const earnings = payslip.lines.filter((l) => l.category === 'BASIC' || l.category === 'ALW')
  const deductions = payslip.lines.filter((l) => l.category === 'DED')

  return (
    <div className="min-h-screen bg-neutral-100 py-8 print:bg-white print:py-0 dark:bg-neutral-900 dark:print:bg-white">
      {/* Screen-only controls; the sheet below is what reaches the printer. */}
      <div className="mx-auto mb-4 flex max-w-3xl items-center justify-between px-6 print:hidden">
        <Button variant="secondary" iconLeft={<ArrowLeft size={14} />} onClick={() => navigate(-1)}>
          Back
        </Button>
        <Button iconLeft={<Printer size={14} />} onClick={() => window.print()}>
          Print / Save as PDF
        </Button>
      </div>

      <div className="mx-auto max-w-3xl bg-white p-10 text-neutral-900 shadow-card print:max-w-none print:p-0 print:shadow-none">
        <div className="flex items-start justify-between border-b border-neutral-300 pb-4">
          <div>
            <h1 className="text-xl font-bold">{env.appName}</h1>
            <p className="text-xs text-neutral-500">Payslip for the period</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold">
              {day(payslip.periodStart)} — {day(payslip.periodEnd)}
            </p>
            <p className="text-xs text-neutral-500">{payslip.payrun?.name}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 border-b border-neutral-300 py-4 sm:grid-cols-4">
          <Field label="Employee">{payslip.employee?.name}</Field>
          <Field label="Employee Code">{payslip.employee?.code}</Field>
          <Field label="Salary Structure">{payslip.structureName}</Field>
          <Field label="Worked Days">
            {payslip.workedDays} of {payslip.totalWorkingDays}
          </Field>
        </div>

        <div className="grid gap-8 py-6 sm:grid-cols-2">
          <div>
            <h2 className="mb-2 border-b border-neutral-300 pb-1 text-xs font-semibold uppercase tracking-wider">
              Earnings
            </h2>
            {earnings.map((line) => (
              <div key={line.code} className="flex justify-between py-1 text-sm">
                <span>{line.name}</span>
                <span className="tabular-nums">{money(line.amount)}</span>
              </div>
            ))}
            <div className="mt-1 flex justify-between border-t border-neutral-300 pt-1 text-sm font-semibold">
              <span>Gross</span>
              <span className="tabular-nums">{money(payslip.grossAmount)}</span>
            </div>
          </div>

          <div>
            <h2 className="mb-2 border-b border-neutral-300 pb-1 text-xs font-semibold uppercase tracking-wider">
              Deductions
            </h2>
            {deductions.length ? (
              deductions.map((line) => (
                <div key={line.code} className="flex justify-between py-1 text-sm">
                  <span>{line.name}</span>
                  <span className="tabular-nums">{money(line.amount)}</span>
                </div>
              ))
            ) : (
              <p className="py-1 text-sm text-neutral-500">None</p>
            )}
            <div className="mt-1 flex justify-between border-t border-neutral-300 pt-1 text-sm font-semibold">
              <span>Total Deductions</span>
              <span className="tabular-nums">{money(payslip.deductionAmount)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-y-2 border-neutral-900 py-3">
          <span className="font-semibold">Net Salary</span>
          <span className="text-lg font-bold tabular-nums">₹ {money(payslip.netAmount)}</span>
        </div>

        <p className="mt-3 text-xs">
          <span className="text-neutral-500">In words: </span>
          <span className="font-medium">{amountInWords(payslip.netAmount)}</span>
        </p>

        <p className="mt-10 text-[10px] text-neutral-500">
          Computer generated payslip. No signature required.
        </p>
      </div>
    </div>
  )
}
