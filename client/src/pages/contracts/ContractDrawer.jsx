import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Pencil } from 'lucide-react'
import {
  Badge,
  Button,
  Drawer,
  ErrorState,
  FormField,
  Input,
  ReadOnlyField,
  Skeleton,
} from '@/components/ui'
import {
  contractsApi,
  departmentsApi,
  employeesApi,
  salaryStructuresApi,
  schedulesApi,
} from '@/api/hr'
import { useNotify } from '@/context/NotificationContext'
import { contractSchema } from '@/validations/contract'
import { getErrorMessage } from '@/utils/errorUtils'
import { CONTRACT_STATES } from '@/config/constants'

const toDateInput = (value) => (value ? new Date(value).toISOString().slice(0, 10) : '')

const EMPTY = {
  reference: '',
  employee: '',
  department: '',
  structure: '',
  schedule: '',
  jobPosition: '',
  wage: 0,
  startDate: '',
  endDate: '',
  notes: '',
  state: 'draft',
}

// Odoo fills these from the employee when one is picked, then lets you edit —
// a promotion or transfer is exactly a contract that differs from the record.
function termsFor(employeeId, employees) {
  const employee = employees.find((e) => e._id === employeeId)
  if (!employee) return {}

  return {
    department: employee.department?._id ?? '',
    schedule: employee.schedule?._id ?? '',
    jobPosition: employee.jobPosition ?? '',
  }
}

function Select({ label, htmlFor, required, error, hint, children, ...rest }) {
  return (
    <FormField label={label} htmlFor={htmlFor} required={required} error={error} hint={hint}>
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

export function ContractDrawer({ contractId, presetEmployee, onClose, onSaved }) {
  const isNew = contractId === 'new'
  const notify = useNotify()

  const [options, setOptions] = useState({
    employees: [],
    departments: [],
    structures: [],
    schedules: [],
  })
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [editing, setEditing] = useState(isNew)
  const [record, setRecord] = useState(null)

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(contractSchema), defaultValues: EMPTY })

  const employeeField = register('employee')

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      try {
        const [{ employees }, { departments }, { structures }, { schedules }] = await Promise.all([
          employeesApi.list(),
          departmentsApi.list(),
          salaryStructuresApi.list(),
          schedulesApi.list(),
        ])
        if (cancelled) return
        setOptions({ employees, departments, structures, schedules })

        if (isNew) {
          const { reference } = await contractsApi.nextReference(new Date().getFullYear())
          if (cancelled) return
          const preselected = presetEmployee ?? ''
          reset({
            ...EMPTY,
            reference,
            employee: preselected,
            ...termsFor(preselected, employees),
          })
        } else {
          const { contract } = await contractsApi.get(contractId)
          if (cancelled) return
          setRecord(contract)
          reset({
            ...EMPTY,
            ...contract,
            employee: contract.employee?._id ?? '',
            department: contract.department?._id ?? '',
            structure: contract.structure?._id ?? '',
            schedule: contract.schedule?._id ?? '',
            startDate: toDateInput(contract.startDate),
            endDate: toDateInput(contract.endDate),
          })
        }
        setLoadError(null)
      } catch (err) {
        if (!cancelled) setLoadError(err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [contractId, isNew, presetEmployee, reset])

  const onSubmit = handleSubmit(async (data) => {
    const payload = {
      ...data,
      department: data.department || undefined,
      schedule: data.schedule || undefined,
      endDate: data.endDate || null,
    }

    try {
      if (isNew) {
        const { contract } = await contractsApi.create(payload)
        notify.success(`${contract.reference} created`)
      } else {
        await contractsApi.update(contractId, payload)
        notify.success('Changes saved')
        setEditing(false)
      }
      onSaved()
    } catch (err) {
      notify.error(getErrorMessage(err))
    }
  })

  const reference = watch('reference')
  const state = watch('state')
  const stateMeta = CONTRACT_STATES.find((s) => s.value === state)

  return (
    <Drawer
      isOpen
      onClose={onClose}
      size="lg"
      title={isNew ? 'New contract' : reference || 'Contract'}
      description="A running contract is what payroll reads for its period."
      footer={
        editing ? (
          <>
            <Button key="cancel" variant="secondary" onClick={isNew ? onClose : () => setEditing(false)}>
              Cancel
            </Button>
            <Button key="save" type="submit" form="contract-form" loading={isSubmitting}>
              {isNew ? 'Create contract' : 'Save changes'}
            </Button>
          </>
        ) : (
          <>
            <Button key="close" variant="secondary" onClick={onClose}>
              Close
            </Button>
            <Button key="edit" iconLeft={<Pencil size={14} />} onClick={() => setEditing(true)}>
              Edit
            </Button>
          </>
        )
      }
    >
      {loading ? (
        <div className="space-y-4">
          <Skeleton height={64} />
          <Skeleton height={64} />
          <Skeleton height={64} />
        </div>
      ) : loadError ? (
        <ErrorState description={loadError.message} />
      ) : !editing && record ? (
        <div className="space-y-5">
          <Badge tone={stateMeta?.tone ?? 'neutral'} dot={state === 'running'}>
            {stateMeta?.label ?? state}
          </Badge>

          <div className="grid gap-5 sm:grid-cols-2">
            <ReadOnlyField label="Reference">
              <span className="font-mono">{record.reference}</span>
            </ReadOnlyField>
            <ReadOnlyField label="Employee">{record.employee?.name}</ReadOnlyField>
            <ReadOnlyField label="Department">{record.department?.name}</ReadOnlyField>
            <ReadOnlyField label="Job Position">{record.jobPosition}</ReadOnlyField>
            <ReadOnlyField label="Wage / Month">
              {new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: 'INR',
                maximumFractionDigits: 0,
              }).format(record.wage ?? 0)}
            </ReadOnlyField>
            <ReadOnlyField label="Salary Structure">{record.structure?.name}</ReadOnlyField>
            <ReadOnlyField label="Working Schedule">
              {record.schedule ? `${record.schedule.name} · ${record.schedule.weeklyHours} h/week` : ''}
            </ReadOnlyField>
            <ReadOnlyField label="Start Date">
              {new Date(record.startDate).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
            </ReadOnlyField>
            <ReadOnlyField label="End Date">
              {record.endDate
                ? new Date(record.endDate).toLocaleDateString('en-IN', { dateStyle: 'medium' })
                : 'Open-ended'}
            </ReadOnlyField>
            <div className="sm:col-span-2">
              <ReadOnlyField label="Notes">{record.notes}</ReadOnlyField>
            </div>
          </div>
        </div>
      ) : (
        <form id="contract-form" onSubmit={onSubmit} className="space-y-4">
          {!isNew ? (
            <Badge tone={stateMeta?.tone ?? 'neutral'} dot={state === 'running'}>
              {stateMeta?.label ?? state}
            </Badge>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Reference"
              htmlFor="reference"
              required
              error={errors.reference?.message}
              hint={isNew ? 'Generated for you — change it if you need to' : undefined}
            >
              <Input id="reference" {...register('reference')} />
            </FormField>

            <Select
              label="Employee"
              htmlFor="employee"
              required
              error={errors.employee?.message}
              {...employeeField}
              onChange={(event) => {
                employeeField.onChange(event)
                const terms = termsFor(event.target.value, options.employees)
                Object.entries(terms).forEach(([field, value]) => setValue(field, value))
              }}
            >
              <option value="">Select employee</option>
              {options.employees.map((e) => (
                <option key={e._id} value={e._id}>
                  {e.name} · {e.code}
                </option>
              ))}
            </Select>

            <Select label="Department" htmlFor="department" {...register('department')}>
              <option value="">Select department</option>
              {options.departments.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.name}
                </option>
              ))}
            </Select>

            <FormField label="Job Position" htmlFor="jobPosition">
              <Input id="jobPosition" {...register('jobPosition')} />
            </FormField>

            <FormField label="Wage / Month" htmlFor="wage" required error={errors.wage?.message}>
              <Input id="wage" type="number" min="0" step="1" {...register('wage')} />
            </FormField>

            <Select
              label="Salary Structure"
              htmlFor="structure"
              required
              error={errors.structure?.message}
              {...register('structure')}
            >
              <option value="">Select structure</option>
              {options.structures.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name}
                </option>
              ))}
            </Select>

            <Select label="Working Schedule" htmlFor="schedule" {...register('schedule')}>
              <option value="">Select schedule</option>
              {options.schedules.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name} · {s.weeklyHours} h/week
                </option>
              ))}
            </Select>

            <Select
              label="Status"
              htmlFor="state"
              required
              error={errors.state?.message}
              {...register('state')}
            >
              {CONTRACT_STATES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>

            <FormField
              label="Start Date"
              htmlFor="startDate"
              required
              error={errors.startDate?.message}
            >
              <Input id="startDate" type="date" {...register('startDate')} />
            </FormField>

            <FormField
              label="End Date"
              htmlFor="endDate"
              error={errors.endDate?.message}
              hint="Leave empty for an open-ended contract"
            >
              <Input id="endDate" type="date" {...register('endDate')} />
            </FormField>
          </div>

          <FormField label="Notes" htmlFor="notes">
            <Input id="notes" {...register('notes')} />
          </FormField>
        </form>
      )}
    </Drawer>
  )
}
