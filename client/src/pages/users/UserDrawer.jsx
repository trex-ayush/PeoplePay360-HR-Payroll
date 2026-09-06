import { useCallback, useEffect, useState } from 'react'
import { Mail } from 'lucide-react'
import {
  Badge,
  Button,
  Checkbox,
  Drawer,
  ErrorState,
  FormField,
  ReadOnlyField,
  Skeleton,
} from '@/components/ui'
import { InviteLink, RolePicker } from '@/pages/employees/AccessTab'
import { usersApi } from '@/api/hr'
import { useAuth } from '@/context/AuthContext'
import { useNotify } from '@/context/NotificationContext'
import { getErrorMessage } from '@/utils/errorUtils'
import { ROLE_LABELS } from '@/config/constants'

export function UserDrawer({ userId, onClose, onSaved }) {
  const isNew = userId === 'new'
  const notify = useNotify()
  const { user: actor } = useAuth()

  const [data, setData] = useState(null)
  const [employees, setEmployees] = useState([])
  const [form, setForm] = useState({ employee: '', roles: ['employee'], active: true })
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      if (isNew) {
        const { employees } = await usersApi.availableEmployees()
        setEmployees(employees)
      } else {
        const result = await usersApi.get(userId)
        setData(result)
        setForm({
          employee: result.user.employeeId?._id ?? '',
          roles: result.user.roles,
          active: result.user.active,
        })
      }
      setLoadError(null)
    } catch (err) {
      setLoadError(err)
    } finally {
      setLoading(false)
    }
  }, [userId, isNew])

  useEffect(() => {
    load()
  }, [load])

  const isSelf = data && String(actor._id ?? actor.id) === String(data.user._id)
  const chosen = employees.find((employee) => employee._id === form.employee)

  async function save() {
    setSaving(true)
    try {
      if (isNew) {
        const { invite } = await usersApi.create({ employee: form.employee, roles: form.roles })
        notify.success(
          invite?.emailSent
            ? 'Account created and the invite emailed'
            : 'Account created — share the invite link with them'
        )
      } else {
        await usersApi.update(userId, { roles: form.roles, active: form.active })
        notify.success('Access updated')
        await load()
      }
      onSaved()
    } catch (err) {
      notify.error(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  async function resend() {
    try {
      await usersApi.invite(userId)
      notify.success('Invite sent again')
      await load()
    } catch (err) {
      notify.error(getErrorMessage(err))
    }
  }

  return (
    <Drawer
      isOpen
      onClose={onClose}
      size="md"
      title={isNew ? 'New user' : (data?.user.name ?? 'User')}
      description="A user account is how somebody signs in. Its roles decide which modules they can reach."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button onClick={save} loading={saving} disabled={isSelf || (isNew && !form.employee)}>
            {isNew ? 'Create user' : 'Save access'}
          </Button>
        </>
      }
    >
      {loading ? (
        <div className="space-y-4">
          <Skeleton height={64} />
          <Skeleton height={120} />
        </div>
      ) : loadError ? (
        <ErrorState description={getErrorMessage(loadError)} />
      ) : (
        <div className="space-y-5">
          {isNew ? (
            <>
              <FormField
                label="Employee"
                htmlFor="employee"
                required
                hint="Only employees without an account are listed"
              >
                <select
                  id="employee"
                  value={form.employee}
                  onChange={(e) => setForm((c) => ({ ...c, employee: e.target.value }))}
                  className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
                >
                  <option value="">Select employee</option>
                  {employees.map((employee) => (
                    <option key={employee._id} value={employee._id}>
                      {employee.name} · {employee.code}
                    </option>
                  ))}
                </select>
              </FormField>

              <ReadOnlyField label="Work Email">
                {chosen?.workEmail ?? '—'}
              </ReadOnlyField>
            </>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2">
              <ReadOnlyField label="Employee">
                {data.user.employeeId?.name ?? 'Not linked'}
              </ReadOnlyField>
              <ReadOnlyField label="Work Email">{data.user.email}</ReadOnlyField>
              <ReadOnlyField label="Account Status">
                <Badge tone={data.user.active ? 'success' : 'neutral'} size="sm" dot={data.user.active}>
                  {data.user.active ? 'Active' : 'Inactive'}
                </Badge>
              </ReadOnlyField>
              <ReadOnlyField label="Sign In">
                {data.user.password === undefined && data.invites.some((i) => i.status === 'used')
                  ? 'Password set'
                  : data.invites.length
                    ? 'Invited, not signed in yet'
                    : 'No invite sent'}
              </ReadOnlyField>
            </div>
          )}

          <FormField label="Roles" required hint="A user needs at least one">
            <RolePicker
              roles={form.roles}
              disabled={isSelf}
              onChange={(roles) => setForm((c) => ({ ...c, roles }))}
            />
          </FormField>

          {!isNew ? (
            <Checkbox
              label="Active"
              description="An inactive account keeps its history but cannot sign in."
              checked={form.active}
              disabled={isSelf}
              onChange={(e) => setForm((c) => ({ ...c, active: e.target.checked }))}
            />
          ) : null}

          {isSelf ? (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              This is your own account. Another admin has to change it.
            </p>
          ) : null}

          {!isNew && data.invites.length ? (
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-wider text-neutral-500">Invites</p>
              {data.invites.map((invite) => (
                <InviteLink key={invite._id} invite={invite} onResend={resend} />
              ))}
            </div>
          ) : null}

          {!isNew && !data.invites.length ? (
            <Button size="sm" variant="secondary" iconLeft={<Mail size={13} />} onClick={resend}>
              Send an invite link
            </Button>
          ) : null}
        </div>
      )}
    </Drawer>
  )
}
