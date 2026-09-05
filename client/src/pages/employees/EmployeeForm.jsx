import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
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
import { departmentsApi, employeesApi, schedulesApi } from '@/api/hr'
import { useNotify } from '@/context/NotificationContext'
import { usePageTitle } from '@/hooks/usePageTitle'
import { employeeSchema } from '@/validations/employee'
import { getErrorMessage } from '@/utils/errorUtils'
import { EMPLOYEE_TYPES } from '@/config/constants'

const EMPTY = {
  code: '',
  name: '',
  workEmail: '',
  phone: '',
  department: '',
  manager: '',
  schedule: '',
  jobPosition: '',
  workLocation: '',
  employeeType: 'full_time',
  bankAccount: '',
  active: true,
}

const RELATED = [
  { to: 'contracts', label: 'Contracts' },
  { to: 'attendance', label: 'Attendance' },
  { to: 'time-off', label: 'Time Off' },
]

// A1 asks for direct links from the employee form into the related record lists,
// each filtered to this employee. Counts arrive once those modules are built.
function RelatedRecords({ employeeId }) {
  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {RELATED.map((item) => (
        <Link
          key={item.to}
          to={`/${item.to}?employee=${employeeId}`}
          className="rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition-colors hover:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:border-neutral-500"
        >
          {item.label}
        </Link>
      ))}
    </div>
  )
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

export default function EmployeeForm() {
  const { id } = useParams()
  const isNew = id === 'new'
  usePageTitle(isNew ? 'New employee' : 'Employee')

  const navigate = useNavigate()
  const notify = useNotify()

  const [options, setOptions] = useState({ departments: [], schedules: [], employees: [] })
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(employeeSchema), defaultValues: EMPTY })

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      try {
        const [{ departments }, { schedules }, { employees }] = await Promise.all([
          departmentsApi.list(),
          schedulesApi.list(),
          employeesApi.list(),
        ])
        if (cancelled) return
        setOptions({ departments, schedules, employees })

        if (!isNew) {
          const { employee } = await employeesApi.get(id)
          if (cancelled) return
          reset({
            ...EMPTY,
            ...employee,
            department: employee.department?._id ?? '',
            manager: employee.manager?._id ?? '',
            schedule: employee.schedule?._id ?? '',
            active: employee.active,
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
  }, [id, isNew, reset])

  const onSubmit = handleSubmit(async (data) => {
    const payload = {
      ...data,
      manager: data.manager || null,
      department: data.department || undefined,
      schedule: data.schedule || undefined,
    }

    try {
      if (isNew) {
        const { employee } = await employeesApi.create(payload)
        notify.success(`${employee.name} created`)
        navigate(`/employees/${employee._id}`, { replace: true })
      } else {
        await employeesApi.update(id, payload)
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

  const name = watch('name')
  const isActive = String(watch('active')) !== 'false'

  return (
    <PageContainer>
      <p className="mb-2 text-xs text-neutral-500 dark:text-neutral-400">
        <Link to="/employees" className="hover:underline">
          Employees
        </Link>
        <span className="mx-1.5">/</span>
        {isNew ? 'New' : name}
      </p>

      <PageHeader
        title={isNew ? 'New employee' : name || 'Employee'}
        description={
          isNew ? 'Create an employee record.' : 'HR details for this employee.'
        }
        actions={
          !isNew ? (
            isActive ? (
              <Badge tone="success" dot>
                Active
              </Badge>
            ) : (
              <Badge tone="neutral">Archived</Badge>
            )
          ) : null
        }
      />

      {!isNew ? <RelatedRecords employeeId={id} /> : null}

      <form onSubmit={onSubmit}>
        <Card className="mb-4">
          <CardHeader>
            <h2 className="font-semibold">Work Information</h2>
          </CardHeader>
          <CardBody>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <FormField label="Employee Code" htmlFor="code" required error={errors.code?.message}>
                <Input id="code" placeholder="EMP001" {...register('code')} />
              </FormField>

              <FormField label="Name" htmlFor="name" required error={errors.name?.message}>
                <Input id="name" {...register('name')} />
              </FormField>

              <FormField
                label="Work Email"
                htmlFor="workEmail"
                required
                error={errors.workEmail?.message}
              >
                <Input id="workEmail" type="email" {...register('workEmail')} />
              </FormField>

              <FormField label="Phone" htmlFor="phone" error={errors.phone?.message}>
                <Input id="phone" {...register('phone')} />
              </FormField>

              <Select
                label="Department"
                htmlFor="department"
                error={errors.department?.message}
                {...register('department')}
              >
                <option value="">Select department</option>
                {options.departments.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.name}
                  </option>
                ))}
              </Select>

              <Select label="Manager" htmlFor="manager" {...register('manager')}>
                <option value="">No manager</option>
                {options.employees
                  .filter((e) => e._id !== id)
                  .map((e) => (
                    <option key={e._id} value={e._id}>
                      {e.name}
                    </option>
                  ))}
              </Select>

              <Select
                label="Working Schedule"
                htmlFor="schedule"
                error={errors.schedule?.message}
                {...register('schedule')}
              >
                <option value="">Select schedule</option>
                {options.schedules.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name} · {s.weeklyHours} h/week
                  </option>
                ))}
              </Select>

              <FormField label="Job Position" htmlFor="jobPosition">
                <Input id="jobPosition" {...register('jobPosition')} />
              </FormField>

              <FormField label="Work Location" htmlFor="workLocation">
                <Input id="workLocation" placeholder="Mumbai" {...register('workLocation')} />
              </FormField>

              <Select label="Employee Type" htmlFor="employeeType" {...register('employeeType')}>
                {EMPLOYEE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Select>

              <FormField
                label="Bank Account"
                htmlFor="bankAccount"
                hint="Payroll warns when this is missing"
              >
                <Input id="bankAccount" {...register('bankAccount')} />
              </FormField>

              <Select label="Status" htmlFor="active" {...register('active')}>
                <option value="true">Active</option>
                <option value="false">Archived</option>
              </Select>
            </div>
          </CardBody>
        </Card>

        <div className="flex items-center gap-2">
          <Button type="submit" loading={isSubmitting}>
            {isNew ? 'Create employee' : 'Save changes'}
          </Button>
          <Button type="button" variant="secondary" onClick={() => navigate('/employees')}>
            Cancel
          </Button>
        </div>
      </form>
    </PageContainer>
  )
}
