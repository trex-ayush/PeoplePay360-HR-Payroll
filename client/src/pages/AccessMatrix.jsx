import { Fragment } from 'react'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { Avatar, Badge, Card, CardBody, CardHeader } from '@/components/ui'
import { ROLE_LABELS } from '@/config/constants'
import { useAuth } from '@/context/AuthContext'
import { usePageTitle } from '@/hooks/usePageTitle'
import { cn } from '@/utils/cn'

const ROLE_ORDER = ['employee', 'hr_manager', 'hr_payroll_user', 'hr_payroll_manager', 'admin']

const ROLE_SUMMARY = {
  employee: 'Sees only their own records and raises time off requests.',
  hr_manager: 'Runs every people module end to end, with no payroll access.',
  hr_payroll_user: 'Everything an HR Manager can do, plus payruns. Salary config stays read-only.',
  hr_payroll_manager: 'Full payroll control, including the salary rules behind every payslip.',
  admin: 'Full access to every module, plus users and role assignment.',
}

const LEVELS = {
  own: { label: 'Own only', tone: 'info' },
  read: { label: 'Read only', tone: 'warning' },
  write: { label: 'Create & edit', tone: 'primary' },
  full: { label: 'Full access', tone: 'success' },
}

// Each access array is positional and follows ROLE_ORDER.
const GROUPS = [
  {
    title: 'People',
    rows: [
      { module: 'Employees', access: ['own', 'full', 'full', 'full', 'full'] },
      { module: 'Contracts', access: [null, 'full', 'full', 'full', 'full'] },
      { module: 'Departments', access: [null, 'full', 'full', 'full', 'full'] },
      { module: 'Working Schedules', access: [null, 'full', 'full', 'full', 'full'] },
      { module: 'Attendance', access: ['own', 'full', 'full', 'full', 'full'] },
      { module: 'Time Off Requests', access: ['own', 'full', 'full', 'full', 'full'] },
      { module: 'Time Off Allocations', access: ['own', 'full', 'full', 'full', 'full'] },
    ],
  },
  {
    title: 'Payroll',
    rows: [
      { module: 'Pay Runs', access: [null, null, 'write', 'full', 'full'] },
      { module: 'Payslips', access: [null, null, 'write', 'full', 'full'] },
      { module: 'Salary Structures', access: [null, null, 'read', 'full', 'full'] },
      { module: 'Salary Rules', access: [null, null, 'read', 'full', 'full'] },
    ],
  },
  {
    title: 'System',
    rows: [{ module: 'Users & Role Assignment', access: [null, null, null, null, 'full'] }],
  },
]

function AccessCell({ level, highlighted }) {
  const meta = LEVELS[level]

  return (
    <td
      className={cn(
        'px-4 py-3 text-center',
        highlighted && 'bg-primary-50/60 dark:bg-primary-900/20'
      )}
    >
      {meta ? (
        <Badge tone={meta.tone} size="sm">
          {meta.label}
        </Badge>
      ) : (
        <span className="text-neutral-300 dark:text-neutral-600">—</span>
      )}
    </td>
  )
}

export default function AccessMatrix() {
  usePageTitle('Access & Roles')
  const { user } = useAuth()

  const mine = ROLE_ORDER.map((role) => user.roles.includes(role))

  return (
    <PageContainer maxWidth="lg">
      <PageHeader
        title="Access & Roles"
        description="Your role decides which screens appear in the sidebar and which actions the API will accept."
      />

      <Card className="mb-6">
        <CardBody className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <Avatar name={user.name} size="lg" />

          <div className="min-w-0 flex-1">
            <p className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              {user.name}
            </p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">{user.email}</p>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {user.roles.map((role) => (
                <Badge key={role} tone="primary">
                  {ROLE_LABELS[role]}
                </Badge>
              ))}
            </div>

            <ul className="mt-3 space-y-1 text-sm text-neutral-600 dark:text-neutral-300">
              {user.roles.map((role) => (
                <li key={role}>{ROLE_SUMMARY[role]}</li>
              ))}
            </ul>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-medium text-neutral-900 dark:text-neutral-100">Permission matrix</p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Higher roles inherit everything the role to their left can do.
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {Object.entries(LEVELS).map(([key, meta]) => (
              <Badge key={key} tone={meta.tone} size="sm">
                {meta.label}
              </Badge>
            ))}
          </div>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-700">
                <th className="px-4 py-3 text-left font-medium text-neutral-500 dark:text-neutral-400">
                  Module
                </th>
                {ROLE_ORDER.map((role, i) => (
                  <th
                    key={role}
                    className={cn(
                      'px-4 py-3 text-center font-medium whitespace-nowrap',
                      mine[i]
                        ? 'bg-primary-50/60 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300'
                        : 'text-neutral-500 dark:text-neutral-400'
                    )}
                  >
                    {ROLE_LABELS[role]}
                    {mine[i] ? (
                      <span className="ml-1.5 text-[10px] uppercase tracking-wide">You</span>
                    ) : null}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {GROUPS.map((group) => (
                <Fragment key={group.title}>
                  <tr className="bg-neutral-50 dark:bg-neutral-900/50">
                    <td
                      colSpan={ROLE_ORDER.length + 1}
                      className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500"
                    >
                      {group.title}
                    </td>
                  </tr>

                  {group.rows.map((row) => (
                    <tr
                      key={row.module}
                      className="border-t border-neutral-100 dark:border-neutral-700/50"
                    >
                      <td className="px-4 py-3 font-medium text-neutral-800 dark:text-neutral-200 whitespace-nowrap">
                        {row.module}
                      </td>
                      {row.access.map((level, i) => (
                        <AccessCell key={ROLE_ORDER[i]} level={level} highlighted={mine[i]} />
                      ))}
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </PageContainer>
  )
}
