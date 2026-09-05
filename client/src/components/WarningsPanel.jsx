import { AlertTriangle, ShieldAlert } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card, CardBody, CardHeader, Skeleton } from '@/components/ui'

const TONE = {
  danger: {
    icon: ShieldAlert,
    row: 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-900/20',
    text: 'text-red-700 dark:text-red-300',
  },
  warning: {
    icon: AlertTriangle,
    row: 'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-900/20',
    text: 'text-amber-700 dark:text-amber-300',
  },
}

export function WarningsPanel({ warnings, loading }) {
  if (loading) return <Skeleton height={120} className="mb-6 rounded-xl" />
  if (!warnings.length) return null

  const blocking = warnings.filter((w) => w.severity === 'danger').length

  return (
    <Card className="mb-6">
      <CardHeader>
        <h2 className="font-semibold">
          {warnings.length} thing{warnings.length === 1 ? '' : 's'} to look at before validating
        </h2>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          {blocking
            ? `${blocking} of these will produce a wrong or missing payslip.`
            : 'None of these stop the run — they are for you to decide on.'}
        </p>
      </CardHeader>
      <CardBody className="space-y-2">
        {warnings.map((warning, index) => {
          const tone = TONE[warning.severity] ?? TONE.warning
          const Icon = tone.icon

          return (
            <div
              key={`${warning.type}-${warning.employee._id}-${index}`}
              className={`flex items-start gap-3 rounded-lg border px-3 py-2 ${tone.row}`}
            >
              <Icon size={16} className={`mt-0.5 flex-shrink-0 ${tone.text}`} />
              <p className="text-sm text-neutral-700 dark:text-neutral-200">
                <Link
                  to={warning.link}
                  className="font-medium underline underline-offset-2 hover:opacity-80"
                >
                  {warning.employee.name}
                </Link>{' '}
                — {warning.message}
              </p>
            </div>
          )
        })}
      </CardBody>
    </Card>
  )
}
