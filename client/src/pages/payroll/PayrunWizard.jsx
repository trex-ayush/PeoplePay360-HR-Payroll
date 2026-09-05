import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import { Button, ErrorState, FormField, Input, Modal, Skeleton } from '@/components/ui'
import { payrunsApi, salaryStructuresApi } from '@/api/hr'
import { useNotify } from '@/context/NotificationContext'
import { getErrorMessage } from '@/utils/errorUtils'
import { EMPLOYEE_TYPES } from '@/config/constants'

const money = (value) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
    .format(value ?? 0)

const day = (value) =>
  value ? new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''

const monthName = (value) =>
  value
    ? new Date(value).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
    : 'New payrun'

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

function Checkbox({ checked, onChange, label }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 rounded border-neutral-300 accent-neutral-900 dark:border-neutral-600 dark:accent-neutral-100"
      />
      {label}
    </label>
  )
}

/**
 * Step 1 lives entirely in component state.
 *
 * The spec is explicit that Continue moves to employee selection *without*
 * creating the Payrun, so nothing is written until Create Payrun in step 2.
 */
export function PayrunWizard({ onClose, onCreated }) {
  const notify = useNotify()

  const [step, setStep] = useState(1)
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
    if (step !== 2) return

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

  const scopeReady = scope.structure && scope.periodStart && scope.periodEnd

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

  const allVisibleSelected = visible.length > 0 && visible.every((e) => selected.includes(e._id))

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

  if (step === 1) {
    return (
      <Modal
        isOpen
        onClose={onClose}
        size="md"
        title="New Pay Run"
        description="This step only defines the scope. Nothing is saved yet."
        footer={
          <>
            <Button variant="secondary" onClick={onClose}>
              Discard
            </Button>
            <Button disabled={!scopeReady} onClick={() => setStep(2)}>
              Continue
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <FormField
            label="Employee Types"
            hint={scope.employeeTypes.length ? undefined : 'Leave empty for all employee types'}
          >
            <div className="flex flex-wrap gap-4 pt-1">
              {EMPLOYEE_TYPES.map((type) => (
                <Checkbox
                  key={type.value}
                  label={type.label}
                  checked={scope.employeeTypes.includes(type.value)}
                  onChange={() => toggleType(type.value)}
                />
              ))}
            </div>
          </FormField>

          <Select
            label="Pay Structure"
            htmlFor="structure"
            required
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

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Period Start" htmlFor="periodStart" required>
              <Input
                id="periodStart"
                type="date"
                value={scope.periodStart}
                onChange={(e) => setScope((s) => ({ ...s, periodStart: e.target.value }))}
              />
            </FormField>
            <FormField label="Period End" htmlFor="periodEnd" required>
              <Input
                id="periodEnd"
                type="date"
                value={scope.periodEnd}
                onChange={(e) => setScope((s) => ({ ...s, periodEnd: e.target.value }))}
              />
            </FormField>
          </div>
        </div>
      </Modal>
    )
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      size="xl"
      title="Select Employee Records"
      description={`${monthName(scope.periodStart)} · ${day(scope.periodStart)} — ${day(scope.periodEnd)}`}
      footer={
        <>
          <Button variant="secondary" onClick={() => setStep(1)}>
            Back
          </Button>
          <Button disabled={!selected.length} loading={saving} onClick={handleCreate}>
            Create Payrun
          </Button>
        </>
      }
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="w-56">
          <Input
            placeholder="Search employees…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            iconLeft={<Search size={16} />}
          />
        </div>
        <span className="text-xs text-neutral-500">
          {selected.length} of {eligible.length} selected
        </span>
      </div>

      {loading ? (
        <div className="space-y-2">
          <Skeleton height={40} />
          <Skeleton height={40} />
          <Skeleton height={40} />
        </div>
      ) : error ? (
        <ErrorState description={getErrorMessage(error)} />
      ) : !eligible.length ? (
        <p className="py-10 text-center text-sm text-neutral-500">
          No employee has a running contract on this structure for the selected period.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-700">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wider text-neutral-500 dark:bg-neutral-800">
              <tr>
                <th className="w-10 px-3 py-2">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleAll}
                    className="h-4 w-4 rounded border-neutral-300 accent-neutral-900 dark:border-neutral-600 dark:accent-neutral-100"
                  />
                </th>
                <th className="px-3 py-2 font-medium">Employee</th>
                <th className="px-3 py-2 font-medium">Working Hours</th>
                <th className="px-3 py-2 font-medium">Start Date</th>
                <th className="px-3 py-2 text-right font-medium">Wage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
              {visible.map((employee) => (
                <tr
                  key={employee._id}
                  onClick={() => toggleOne(employee._id)}
                  className="cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/60"
                >
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={selected.includes(employee._id)}
                      onChange={() => toggleOne(employee._id)}
                      onClick={(e) => e.stopPropagation()}
                      className="h-4 w-4 rounded border-neutral-300 accent-neutral-900 dark:border-neutral-600 dark:accent-neutral-100"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <p className="font-medium">{employee.name}</p>
                    <p className="font-mono text-xs text-neutral-500">{employee.code}</p>
                  </td>
                  <td className="px-3 py-2 text-neutral-600 dark:text-neutral-300">
                    {employee.weeklyHours ? `${employee.weeklyHours} hours/week` : '—'}
                  </td>
                  <td className="px-3 py-2 text-neutral-600 dark:text-neutral-300">
                    {day(employee.contract.startDate)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {money(employee.contract.wage)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  )
}
