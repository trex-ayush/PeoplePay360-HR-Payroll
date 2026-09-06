import { useCallback, useEffect, useState } from 'react'
import { Check, Copy, Mail, Send } from 'lucide-react'
import { Badge, Button, Checkbox, EmptyState, Skeleton } from '@/components/ui'
import { employeesApi, invitesApi } from '@/api/hr'
import { useAuth } from '@/context/AuthContext'
import { useNotify } from '@/context/NotificationContext'
import { getErrorMessage } from '@/utils/errorUtils'
import { ROLE_LABELS } from '@/config/constants'

const GRANTABLE = ['employee', 'hr_manager', 'hr_payroll_user', 'hr_payroll_manager']

const STATUS = {
  pending: { label: 'Not used yet', tone: 'warning' },
  used: { label: 'Used', tone: 'success' },
  expired: { label: 'Expired', tone: 'danger' },
}

const stamp = (value) =>
  new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })

export function RolePicker({ roles, onChange, disabled }) {
  const toggle = (role) =>
    onChange(roles.includes(role) ? roles.filter((r) => r !== role) : [...roles, role])

  return (
    <div className="flex flex-wrap gap-x-6 gap-y-2">
      {GRANTABLE.map((role) => (
        <Checkbox
          key={role}
          label={ROLE_LABELS[role]}
          checked={roles.includes(role)}
          disabled={disabled}
          onChange={() => toggle(role)}
        />
      ))}
    </div>
  )
}

export function InviteLink({ invite, onResend }) {
  const notify = useNotify()
  const [copied, setCopied] = useState(false)
  const status = STATUS[invite.status] ?? STATUS.pending

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(invite.link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      notify.error('Could not copy — select the link and copy it by hand')
    }
  }

  return (
    <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-700">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={status.tone} size="sm">
          {status.label}
        </Badge>
        <Badge tone={invite.emailSent ? 'info' : 'neutral'} size="sm">
          {invite.emailSent ? 'Emailed' : 'Not emailed'}
        </Badge>
        <span className="text-xs text-neutral-500">
          {invite.usedAt ? `Used ${stamp(invite.usedAt)}` : `Expires ${stamp(invite.expiresAt)}`}
        </span>
      </div>

      {invite.status === 'pending' ? (
        <>
          <p className="mt-3 break-all rounded bg-neutral-50 px-2 py-1.5 font-mono text-xs dark:bg-neutral-900">
            {invite.link}
          </p>
          <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
            {invite.emailSent
              ? 'Sent to their work email. Share this link directly if it never arrives.'
              : 'Email is not configured on this server, so share this link with them yourself.'}
          </p>
        </>
      ) : invite.status === 'expired' ? (
        <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
          This link no longer works. Sending again gives them a fresh window.
        </p>
      ) : null}

      {invite.status !== 'used' && onResend ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {invite.status === 'pending' ? (
            <Button
              size="sm"
              variant="secondary"
              iconLeft={copied ? <Check size={13} /> : <Copy size={13} />}
              onClick={copy}
            >
              {copied ? 'Copied' : 'Copy link'}
            </Button>
          ) : null}
          <Button size="sm" variant="ghost" iconLeft={<Mail size={13} />} onClick={onResend}>
            Send again
          </Button>
        </div>
      ) : null}
    </div>
  )
}

export function AccessTab({ employeeId }) {
  const notify = useNotify()
  const { user } = useAuth()

  const isSelf = String(user.employeeId) === String(employeeId)

  const [data, setData] = useState(null)
  const [roles, setRoles] = useState(['employee'])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      const result = await employeesApi.access(employeeId)
      setData(result)
      if (result.user) setRoles(result.user.roles)
    } finally {
      setLoading(false)
    }
  }, [employeeId])

  useEffect(() => {
    load()
  }, [load])

  async function grant() {
    setSaving(true)
    try {
      await employeesApi.grant(employeeId, roles)
      notify.success('Login created — share the link below')
      await load()
    } catch (err) {
      notify.error(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  async function resend(inviteId) {
    try {
      const { invite } = await invitesApi.resend(inviteId)
      notify.success(invite.emailSent ? 'Invite emailed again' : 'New link ready — email is off, share it by hand')
      await load()
    } catch (err) {
      notify.error(getErrorMessage(err))
    }
  }

  if (loading) return <Skeleton height={160} rounded="lg" />

  // Anything not yet used is still actionable, expired ones included.
  const open = data.invites.find((i) => i.status !== 'used')

  return (
    <div className="space-y-5">
      {data.user ? (
        <div>
          <p className="text-sm font-medium">{data.user.email}</p>
          <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
            {data.user.roles.map((r) => ROLE_LABELS[r]).join(', ')}
          </p>
        </div>
      ) : (
        <EmptyState
          compact
          title="No login yet"
          description="Pick the roles this person needs and they will get a link to set their own password."
        />
      )}

      <div>
        <p className="mb-2 text-xs uppercase tracking-wider text-neutral-500">Roles</p>
        <RolePicker roles={roles} onChange={setRoles} disabled={isSelf} />
        {isSelf ? (
          <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
            These are your own roles. Another admin has to change them.
          </p>
        ) : null}
      </div>

      {isSelf ? null : (
        <Button
          iconLeft={<Send size={14} />}
          loading={saving}
          disabled={!roles.length}
          onClick={grant}
        >
          {data.user ? 'Save roles' : 'Create login & send invite'}
        </Button>
      )}

      {open ? <InviteLink invite={open} onResend={() => resend(open._id)} /> : null}

      {data.invites.filter((i) => i.status === 'used').length ? (
        <div>
          <p className="mb-2 text-xs uppercase tracking-wider text-neutral-500">Earlier invites</p>
          <div className="space-y-2">
            {data.invites
              .filter((i) => i.status === 'used')
              .map((invite) => (
                <InviteLink key={invite._id} invite={invite} />
              ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
