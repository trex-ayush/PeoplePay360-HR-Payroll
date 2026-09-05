import { useEffect, useState } from 'react'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowDown, ArrowUp, Plus, X } from 'lucide-react'
import { Button, Drawer, ErrorState, FormField, Input, Skeleton } from '@/components/ui'
import { schedulesApi } from '@/api/hr'
import { useNotify } from '@/context/NotificationContext'
import { scheduleSchema } from '@/validations/schedule'
import { getErrorMessage } from '@/utils/errorUtils'
import { DAYS, SCHEDULE_TYPES } from '@/config/constants'
import { cn } from '@/utils/cn'

const NEW_LINE = { dayOfWeek: 0, startTime: '09:00', endTime: '18:00', breakMinutes: 60 }
const DAY_MINUTES = 24 * 60

const toMinutes = (hhmm) => {
  const [h, m] = (hhmm || '00:00').split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

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

function RowButton({ label, onClick, disabled, danger, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        'rounded p-1 text-neutral-400 transition-colors disabled:cursor-not-allowed disabled:opacity-30',
        danger ? 'hover:text-red-500' : 'hover:text-neutral-700 dark:hover:text-neutral-200'
      )}
    >
      {children}
    </button>
  )
}

export function ScheduleDrawer({ scheduleId, onClose, onSaved }) {
  const isNew = scheduleId === 'new'
  const notify = useNotify()

  const [loading, setLoading] = useState(!isNew)
  const [loadError, setLoadError] = useState(null)

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
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
      .get(scheduleId)
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
  }, [scheduleId, isNew, reset])

  const onSubmit = handleSubmit(async (data) => {
    try {
      const { schedule } = isNew
        ? await schedulesApi.create(data)
        : await schedulesApi.update(scheduleId, data)
      notify.success(
        `${isNew ? `${schedule.name} created` : 'Saved'} · ${schedule.weeklyHours}h per week`
      )
      onSaved()
    } catch (err) {
      notify.error(getErrorMessage(err))
    }
  })

  return (
    <Drawer
      isOpen
      onClose={onClose}
      size="lg"
      title={isNew ? 'New working schedule' : watch('name') || 'Working schedule'}
      description="Weekly hours are derived from the days below."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="schedule-form" loading={isSubmitting}>
            {isNew ? 'Create schedule' : 'Save changes'}
          </Button>
        </>
      }
    >
      {loading ? (
        <div className="space-y-4">
          <Skeleton height={64} />
          <Skeleton height={200} />
        </div>
      ) : loadError ? (
        <ErrorState description={loadError.message} />
      ) : (
        <form id="schedule-form" onSubmit={onSubmit} className="space-y-5">
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

          <div className="rounded-lg border border-neutral-200 dark:border-neutral-700">
            <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3 dark:border-neutral-700">
              <h3 className="text-sm font-semibold">Weekly Schedule</h3>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                iconLeft={<Plus size={14} />}
                onClick={() => append(NEW_LINE)}
              >
                Add Day
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900">
                  <tr className="text-left text-[11px] uppercase tracking-wider text-neutral-500">
                    <th className="px-3 py-2 font-medium">Day</th>
                    <th className="px-3 py-2 font-medium">Start</th>
                    <th className="px-3 py-2 font-medium">End</th>
                    <th className="px-3 py-2 font-medium">Break</th>
                    <th className="px-3 py-2 text-right font-medium">Hours</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                  {fields.map((field, index) => (
                    <tr key={field.id}>
                      <td className="px-3 py-2">
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
                      <td className="px-3 py-2">
                        <Input type="time" {...register(`lines.${index}.startTime`)} />
                      </td>
                      <td className="px-3 py-2">
                        <Input type="time" {...register(`lines.${index}.endTime`)} />
                      </td>
                      <td className="px-3 py-2">
                        <Input type="number" min="0" {...register(`lines.${index}.breakMinutes`)} />
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-neutral-500">
                        {lineHours(lines[index] ?? field)}h
                      </td>
                      <td className="px-3 py-2">
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
                <tfoot className="border-t border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900/50">
                  <tr>
                    <td colSpan={4} className="px-3 py-3 text-right text-sm font-medium">
                      Total Weekly Hours
                    </td>
                    <td className="px-3 py-3 text-right text-sm font-semibold tabular-nums">
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
          </div>
        </form>
      )}
    </Drawer>
  )
}
