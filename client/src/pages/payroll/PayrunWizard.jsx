import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import {
  Avatar,
  Badge,
  Button,
  Checkbox,
  EmptyState,
  ErrorState,
  FormField,
  Input,
  Modal,
  Skeleton,
  Stepper,
} from '@/components/ui'
import { payrunsApi, salaryStructuresApi } from '@/api/hr'
import { useNotify } from '@/context/NotificationContext'
import { getErrorMessage } from '@/utils/errorUtils'
import { EMPLOYEE_TYPES } from '@/config/constants'
import { cn } from '@/utils/cn'

const money = (value) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
    .format(value ?? 0)

const day = (value) =>
  value ? new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''

const monthName = (value) =>
  value ? new Date(value).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : 'New payrun'

const STEPS = [
  { id: 'scope', label: 'Scope' },
  { id: 'employees', label: 'Employees' },
]

// Date inputs want YYYY-MM-DD in local time — toISOString would shift the day.
const isoDay = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

const monthRange = (offset) => {
  const now = new Date()
  return {
    periodStart: isoDay(new Date(now.getFullYear(), now.getMonth() + offset, 1)),
    periodEnd: isoDay(new Date(now.getFullYear(), now.getMonth() + offset + 1, 0)),
  }
}

const PERIOD_PRESETS = [
  { label: 'Last month', offset: -1 },
  { label: 'This month', offset: 0 },
  { label: 'Next month', offset: 1 },
]

function Select({ label, htmlFor, required, hint, children, ...rest }) {
  return (
    <FormField label={label} htmlFor={htmlFor} required={required} hint={hint}>
      <select
        id={htmlFor}
        className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
        {...rest}
      >
        {children}
      </select>
    </FormField>
  )
}

// Scope lives entirely in component state: the spec is explicit that Continue must
// not create the Payrun, so nothing is written until Create Payrun on the last step.
export function PayrunWizard({ onClose, onCreated }) {
  const notify = useNotify()

  const [step, setStep] = useState(0)
  const [scope, setScope] = useState({
    employeeTypes: [],
    structure: '',
    periodStart: '',
    periodEnd: '',
  })

  const [structures, setStructures] = useState([])
  const [eligible, setEligible] = useState([])
  const [selected, setSelected] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    salaryStructuresApi
      .list()
      .then(({ structures }) => setStructures(structures))
      .catch((err) => setError(err))
  }, [])

  useEffect(() => {
    if (step !== 1) return

    let cancelled = false
    setLoading(true)

    payrunsApi
      .eligibleEmployees({
        structure: scope.structure,
        start: scope.periodStart,
        end: scope.periodEnd,
        employeeTypes: scope.employeeTypes.join(','),
      })
      .then(({ employees }) => {
        if (cancelled) return
        setEligible(employees)
        setSelected(employees.map((e) => e._id))
        setError(null)
      })
      .catch((err) => !cancelled && setError(err))
      .finally(() => !cancelled && setLoading(false))

    return () => {
      cancelled = true
    }
  }, [step, scope])

  const periodDays =
    scope.periodStart && scope.periodEnd
      ? Math.round((new Date(scope.periodEnd) - new Date(scope.periodStart)) / 86400000) + 1
      : 0

  const scopeReady = scope.structure && scope.periodStart && scope.periodEnd && periodDays > 0

  const selectedTypeLabels = EMPLOYEE_TYPES.filter((t) => scope.employeeTypes.includes(t.value))
    .map((t) => t.label.toLowerCase())
    .join(', ')

  const toggleType = (value) =>
    setScope((s) => ({
      ...s,
      employeeTypes: s.employeeTypes.includes(value)
        ? s.employeeTypes.filter((t) => t !== value)
        : [...s.employeeTypes, value],
    }))

  const visible = search
    ? eligible.filter((e) => e.name.toLowerCase().includes(search.toLowerCase()))
    : eligible

  const selectedVisible = visible.filter((e) => selected.includes(e._id))
  const allVisibleSelected = visible.length > 0 && selectedVisible.length === visible.length

  const selectedWage = eligible
    .filter((e) => selected.includes(e._id))
    .reduce((total, e) => total + (e.contract?.wage ?? 0), 0)

  const toggleAll = () =>
    setSelected((current) =>
      allVisibleSelected
        ? current.filter((id) => !visible.some((e) => e._id === id))
        : [...new Set([...current, ...visible.map((e) => e._id)])]
    )

  const toggleOne = (id) =>
    setSelected((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id]
    )

  async function handleCreate() {
    setSaving(true)
    try {
      const { payrun } = await payrunsApi.create({
        name: monthName(scope.periodStart),
        structure: scope.structure,
        employeeTypes: scope.employeeTypes,
        periodStart: scope.periodStart,
        periodEnd: scope.periodEnd,
        employees: selected,
      })
      notify.success(`${payrun.name} created with ${selected.length} employees`)
      onCreated(payrun)
    } catch (err) {
      notify.error(getErrorMessage(err))
      setSaving(false)
    }
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      size={step === 0 ? 'lg' : 'xl'}
      className="transition-[max-width] duration-200"
      title="New Pay Run"
      description={
        step === 0
          ? 'Pick the scope first. Nothing is saved until the last step.'
          : `${monthName(scope.periodStart)} · ${day(scope.periodStart)} — ${day(scope.periodEnd)} · ${periodDays} days`
      }
      footer={
        step === 0 ? (
          <>
            <Button variant="secondary" onClick={onClose}>
              Discard
            </Button>
            <Button disabled={!scopeReady} onClick={() => setStep(1)}>
              Continue
            </Button>
          </>
        ) : (
          <>
            <Button variant="secondary" onClick={() => setStep(0)}>
              Back
            </Button>
            <Button disabled={!selected.length} loading={saving} onClick={handleCreate}>
              Create Payrun
            </Button>
          </>
        )
      }
    >
      <div className="-mx-6 -mt-5 mb-6 border-b border-neutral-100 bg-neutral-50/60 px-6 py-3 dark:border-neutral-700 dark:bg-neutral-900/40">
        <Stepper steps={STEPS} current={step} onStepClick={setStep} />
      </div>

      {step === 0 ? (
        <div className="space-y-5">
          <FormField
            label="Employee Types"
            hint={
              scope.employeeTypes.length
                ? `Only ${selectedTypeLabels} will be picked up`
                : 'Nothing picked means every type'
            }
          >
            <div className="flex flex-wrap gap-2 pt-1">
              {EMPLOYEE_TYPES.map((type) => {
                const active = scope.employeeTypes.includes(type.value)

                return (
                  <Button
                    key={type.value}
                    size="sm"
                    variant={active ? 'primary' : 'secondary'}
                    aria-pressed={active}
                    onClick={() => toggleType(type.value)}
                  >
                    {type.label}
                  </Button>
                )
              })}
            </div>
          </FormField>

          <Select
            label="Pay Structure"
            htmlFor="structure"
            required
            hint="Only employees whose running contract uses this structure are picked up."
            value={scope.structure}
            onChange={(e) => setScope((s) => ({ ...s, structure: e.target.value }))}
          >
            <option value="">Select structure</option>
            {structures.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name}
              </option>
            ))}
          </Select>

          <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-700">
            <div className="mb-4 flex flex-wrap gap-2">
              {PERIOD_PRESETS.map((preset) => {
                const range = monthRange(preset.offset)
                const active =
                  scope.periodStart === range.periodStart && scope.periodEnd === range.periodEnd

                return (
                  <Button
                    key={preset.label}
                    size="sm"
                    variant={active ? 'primary' : 'secondary'}
                    onClick={() => setScope((s) => ({ ...s, ...range }))}
                  >
                    {preset.label}
                  </Button>
                )
              })}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Period Start" htmlFor="periodStart" required>
                <Input
                  id="periodStart"
                  type="date"
                  value={scope.periodStart}
                  max={scope.periodEnd || undefined}
                  onChange={(e) => setScope((s) => ({ ...s, periodStart: e.target.value }))}
                />
              </FormField>
              <FormField label="Period End" htmlFor="periodEnd" required>
                <Input
                  id="periodEnd"
                  type="date"
                  value={scope.periodEnd}
                  min={scope.periodStart || undefined}
                  onChange={(e) => setScope((s) => ({ ...s, periodEnd: e.target.value }))}
                />
              </FormField>
            </div>

            <p
              className={cn(
                'mt-3 text-xs',
                periodDays > 0 || !scope.periodStart || !scope.periodEnd
                  ? 'text-neutral-500 dark:text-neutral-400'
                  : 'text-red-600 dark:text-red-400'
              )}
            >
              {periodDays > 0
                ? `${monthName(scope.periodStart)} · ${day(scope.periodStart)} — ${day(scope.periodEnd)} · ${periodDays} days`
                : scope.periodStart && scope.periodEnd
                  ? 'Period end has to fall on or after the start date.'
                  : 'Pick a period, or use one of the buttons above.'}
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="w-60">
              <Input
                placeholder="Search employees…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                iconLeft={<Search size={16} />}
              />
            </div>

            {eligible.length ? (
              <div className="flex items-center gap-3">
                <Badge tone="primary" size="sm">
                  {selected.length} of {eligible.length} selected
                </Badge>
                <span className="text-xs text-neutral-500 dark:text-neutral-400">
                  Wage total{' '}
                  <span className="font-medium tabular-nums text-neutral-800 dark:text-neutral-100">
                    {money(selectedWage)}
                  </span>
                </span>
              </div>
            ) : null}
          </div>

          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} height={52} rounded="lg" />
              ))}
            </div>
          ) : error ? (
            <ErrorState description={getErrorMessage(error)} />
          ) : !eligible.length ? (
            <EmptyState
              compact
              title="No employee matches this scope"
              description="Nobody has a running contract on this structure for the selected period. Go back and widen the scope."
            />
          ) : (
            <div className="max-h-[46vh] overflow-auto rounded-xl border border-neutral-200 dark:border-neutral-700">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-neutral-50 text-left text-xs uppercase tracking-wider text-neutral-500 dark:bg-neutral-900 dark:text-neutral-400">
                  <tr className="border-b border-neutral-200 dark:border-neutral-700">
                    <th className="w-10 px-3 py-2.5">
                      <Checkbox
                        checked={allVisibleSelected}
                        indeterminate={selectedVisible.length > 0 && !allVisibleSelected}
                        onChange={toggleAll}
                        aria-label="Select all"
                      />
                    </th>
                    <th className="px-3 py-2.5 font-medium">Employee</th>
                    <th className="px-3 py-2.5 font-medium">Working Hours</th>
                    <th className="px-3 py-2.5 font-medium">Contract Start</th>
                    <th className="px-3 py-2.5 text-right font-medium">Wage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700/60">
                  {visible.map((employee) => {
                    const checked = selected.includes(employee._id)

                    return (
                      <tr
                        key={employee._id}
                        onClick={() => toggleOne(employee._id)}
                        className={cn(
                          'cursor-pointer transition-colors',
                          checked
                            ? 'bg-primary-50/60 dark:bg-primary-900/20'
                            : 'hover:bg-neutral-50 dark:hover:bg-neutral-700/40'
                        )}
                      >
                        <td className="px-3 py-2.5">
                          <Checkbox
                            checked={checked}
                            onChange={() => toggleOne(employee._id)}
                            onClick={(e) => e.stopPropagation()}
                            aria-label={`Select ${employee.name}`}
                          />
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2.5">
                            <Avatar name={employee.name} size="sm" />
                            <div className="min-w-0">
                              <p className="truncate font-medium">{employee.name}</p>
                              <p className="font-mono text-xs text-neutral-500">{employee.code}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-neutral-600 dark:text-neutral-300">
                          {employee.weeklyHours ? `${employee.weeklyHours} h/week` : '—'}
                        </td>
                        <td className="px-3 py-2.5 text-neutral-600 dark:text-neutral-300">
                          {day(employee.contract.startDate)}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums">
                          {money(employee.contract.wage)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              {visible.length === 0 ? (
                <p className="px-3 py-8 text-center text-sm text-neutral-500 dark:text-neutral-400">
                  No employee matches “{search}”.
                </p>
              ) : null}
            </div>
          )}
        </>
      )}
    </Modal>
  )
}
