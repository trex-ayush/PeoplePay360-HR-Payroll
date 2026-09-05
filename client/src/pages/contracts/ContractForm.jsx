import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  ErrorState,
  FormField,
  Input,
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
import { usePageTitle } from '@/hooks/usePageTitle'
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

function Select({ label, htmlFor, required, error, children, ...rest }) {
  return (
    <FormField label={label} htmlFor={htmlFor} required={required} error={error}>
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

export default function ContractForm() {
  const { id } = useParams()
  const isNew = id === 'new'
  usePageTitle(isNew ? 'New contract' : 'Contract')

  const navigate = useNavigate()
  const notify = useNotify()
  const [params] = useSearchParams()

  const [options, setOptions] = useState({
    employees: [],
    departments: [],
    structures: [],
    schedules: [],
  })
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)

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

          const preselected = params.get('employee') ?? ''
          reset({ ...EMPTY, reference, employee: preselected, ...termsFor(preselected, employees) })
        } else {
          const { contract } = await contractsApi.get(id)
          if (cancelled) return
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
  }, [id, isNew, params, reset])

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
        navigate('/contracts')
      } else {
        await contractsApi.update(id, payload)
        notify.success('Changes saved')
      }
    } catch (err) {
      notify.error(getErrorMessage(err))
    }
  })

  if (loading) {
    return (
      <PageContainer>
        <Skeleton height={36} width="35%" className="mb-6" />
        <Skeleton height={340} rounded="lg" />
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

  const reference = watch('reference')
  const state = watch('state')
  const stateMeta = CONTRACT_STATES.find((s) => s.value === state)

  return (
    <PageContainer>
      <p className="mb-2 text-xs text-neutral-500 dark:text-neutral-400">
        <Link to="/contracts" className="hover:underline">
          Contracts
        </Link>
        <span className="mx-1.5">/</span>
        {isNew ? 'New' : reference}
      </p>

      <PageHeader
        title={isNew ? 'New contract' : reference || 'Contract'}
        description="A running contract is what payroll reads for its period."
        actions={
          <Badge tone={stateMeta?.tone ?? 'neutral'} dot={state === 'running'}>
            {stateMeta?.label ?? state}
          </Badge>
        }
      />

      <form onSubmit={onSubmit}>
        <Card className="mb-4">
          <CardHeader>
            <h2 className="font-semibold">Employment Terms</h2>
          </CardHeader>
          <CardBody>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

              <FormField
                label="Wage / Month"
                htmlFor="wage"
                required
                error={errors.wage?.message}
              >
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
            </div>

            <div className="mt-4">
              <FormField label="Notes" htmlFor="notes">
                <Input id="notes" {...register('notes')} />
              </FormField>
            </div>
          </CardBody>
        </Card>

        <div className="flex items-center gap-2">
          <Button type="submit" loading={isSubmitting}>
            {isNew ? 'Create contract' : 'Save changes'}
          </Button>
          <Button type="button" variant="secondary" onClick={() => navigate('/contracts')}>
            Cancel
          </Button>
        </div>
      </form>
    </PageContainer>
  )
}
