import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowDown, ArrowUp, Plus, X } from 'lucide-react'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button, Card, CardBody, CardHeader, ErrorState, FormField, Input, Skeleton } from '@/components/ui'
import { schedulesApi } from '@/api/hr'
import { useNotify } from '@/context/NotificationContext'
import { usePageTitle } from '@/hooks/usePageTitle'
import { scheduleSchema } from '@/validations/schedule'
import { getErrorMessage } from '@/utils/errorUtils'
import { DAYS, SCHEDULE_TYPES } from '@/config/constants'
import { cn } from '@/utils/cn'

const NEW_LINE = { dayOfWeek: 0, startTime: '09:00', endTime: '18:00', breakMinutes: 60 }

const toMinutes = (hhmm) => {
  const [h, m] = (hhmm || '00:00').split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

const DAY_MINUTES = 24 * 60

// Mirrors the server's lineHours so the total updates as you type,
// but the value saved is always the one the server derives.
const lineHours = (line) => {
  if (!line) return 0
  const start = toMinutes(line.startTime)
  let end = toMinutes(line.endTime)
  if (end <= start) end += DAY_MINUTES

  const span = end - start - Number(line.breakMinutes || 0)
  return Math.round((Math.max(0, span) / 60) * 100) / 100
}

export default function ScheduleForm() {
  const { id } = useParams()
  const isNew = id === 'new'
  usePageTitle(isNew ? 'New schedule' : 'Working schedule')

  const navigate = useNavigate()
  const notify = useNotify()

  const [loading, setLoading] = useState(!isNew)
  const [loadError, setLoadError] = useState(null)

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(scheduleSchema),
    defaultValues: { name: '', type: 'full_time', timezone: '', lines: [NEW_LINE] },
  })

  const { fields, append, remove, move } = useFieldArray({ control, name: 'lines' })
  const lines = useWatch({ control, name: 'lines' }) ?? []
  const totalHours = Math.round(lines.reduce((sum, l) => sum + lineHours(l), 0) * 100) / 100

  useEffect(() => {
    if (isNew) return
    let cancelled = false

    schedulesApi
      .get(id)
      .then(({ schedule }) => {
        if (cancelled) return
        reset({
          name: schedule.name,
          type: schedule.type ?? 'full_time',
          timezone: schedule.timezone ?? '',
          lines: schedule.lines.length ? schedule.lines : [NEW_LINE],
        })
      })
      .catch((err) => !cancelled && setLoadError(err))
      .finally(() => !cancelled && setLoading(false))

    return () => {
      cancelled = true
    }
  }, [id, isNew, reset])

  const onSubmit = handleSubmit(async (data) => {
    try {
      if (isNew) {
        const { schedule } = await schedulesApi.create(data)
        notify.success(`${schedule.name} created · ${schedule.weeklyHours}h per week`)
        navigate(`/working-schedules/${schedule._id}`, { replace: true })
      } else {
        const { schedule } = await schedulesApi.update(id, data)
        notify.success(`Saved · ${schedule.weeklyHours}h per week`)
      }
    } catch (err) {
      notify.error(getErrorMessage(err))
    }
  })

  if (loading) {
    return (
      <PageContainer>
        <Skeleton height={36} width="35%" className="mb-6" />
        <Skeleton height={320} rounded="lg" />
      </PageContainer>
    )
  }

  if (loadError) {
    return (
      <PageContainer>
        <ErrorState description={loadError.message} onRetry={() => navigate(0)} />
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <p className="mb-2 text-xs text-neutral-500 dark:text-neutral-400">
        <Link to="/working-schedules" className="hover:underline">
          Working Schedules
        </Link>
        <span className="mx-1.5">/</span>
        {isNew ? 'New' : 'Edit'}
      </p>

      <PageHeader
        title={isNew ? 'New working schedule' : 'Working schedule'}
        description="Weekly hours are derived from the days below."
      />

      <form onSubmit={onSubmit}>
        <Card className="mb-4">
          <CardBody>
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField label="Schedule Name" htmlFor="name" required error={errors.name?.message}>
                <Input id="name" placeholder="40 Hours / Week" {...register('name')} />
              </FormField>
              <FormField label="Type" htmlFor="type" required error={errors.type?.message}>
                <select
                  id="type"
                  className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
                  {...register('type')}
                >
                  {SCHEDULE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Timezone" htmlFor="timezone">
                <Input id="timezone" placeholder="Asia/Kolkata" {...register('timezone')} />
              </FormField>
            </div>
          </CardBody>
        </Card>

        <Card className="mb-4">
          <CardHeader className="flex items-center justify-between">
            <h2 className="font-semibold">Weekly Schedule</h2>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              iconLeft={<Plus size={14} />}
              onClick={() => append(NEW_LINE)}
            >
              Add Day
            </Button>
          </CardHeader>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-700">
                <tr className="text-left text-xs uppercase tracking-wider text-neutral-500">
                  <th className="px-4 py-3 font-medium">Day</th>
                  <th className="px-4 py-3 font-medium">Start Time</th>
                  <th className="px-4 py-3 font-medium">End Time</th>
                  <th className="px-4 py-3 font-medium">Break (min)</th>
                  <th className="px-4 py-3 font-medium text-right">Hours</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                {fields.map((field, index) => (
                  <tr key={field.id}>
                    <td className="px-4 py-2">
                      <select
                        className="w-full rounded-lg border border-neutral-300 bg-white px-2 py-1.5 text-sm dark:border-neutral-600 dark:bg-neutral-800"
                        {...register(`lines.${index}.dayOfWeek`)}
                      >
                        {DAYS.map((day, i) => (
                          <option key={day} value={i}>
                            {day}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-2">
                      <Input type="time" {...register(`lines.${index}.startTime`)} />
                    </td>
                    <td className="px-4 py-2">
                      <Input type="time" {...register(`lines.${index}.endTime`)} />
                    </td>
                    <td className="px-4 py-2">
                      <Input type="number" min="0" {...register(`lines.${index}.breakMinutes`)} />
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-neutral-500">
                      {lineHours(lines[index] ?? field)}h
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center justify-end gap-0.5">
                        <RowButton
                          label="Move up"
                          onClick={() => move(index, index - 1)}
                          disabled={index === 0}
                        >
                          <ArrowUp size={16} />
                        </RowButton>
                        <RowButton
                          label="Move down"
                          onClick={() => move(index, index + 1)}
                          disabled={index === fields.length - 1}
                        >
                          <ArrowDown size={16} />
                        </RowButton>
                        <RowButton
                          label="Remove day"
                          onClick={() => remove(index)}
                          disabled={fields.length === 1}
                          danger
                        >
                          <X size={16} />
                        </RowButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900/50">
                <tr>
                  <td colSpan={4} className="px-4 py-3 text-right text-sm font-medium">
                    Total Weekly Hours
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-semibold tabular-nums">
                    {totalHours}h
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>

          {errors.lines?.message ? (
            <p className="px-4 py-3 text-xs text-red-500">{errors.lines.message}</p>
          ) : null}
        </Card>

        <div className="flex items-center gap-2">
          <Button type="submit" loading={isSubmitting}>
            {isNew ? 'Create schedule' : 'Save changes'}
          </Button>
          <Button type="button" variant="secondary" onClick={() => navigate('/working-schedules')}>
            Cancel
          </Button>
        </div>
      </form>
    </PageContainer>
  )
}

function RowButton({ label, onClick, disabled, danger, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        'p-1 rounded text-neutral-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed',
        danger ? 'hover:text-red-500' : 'hover:text-neutral-700 dark:hover:text-neutral-200'
      )}
    >
      {children}
    </button>
  )
}
