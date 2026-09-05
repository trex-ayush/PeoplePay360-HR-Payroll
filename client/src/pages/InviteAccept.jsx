import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button, ErrorState, FormField, Input, Skeleton } from '@/components/ui'
import { invitesApi } from '@/api/hr'
import { useAuth } from '@/context/AuthContext'
import { usePageTitle } from '@/hooks/usePageTitle'
import { getErrorMessage } from '@/utils/errorUtils'
import { ROUTES } from '@/config/constants'
import { env } from '@/config/env'

export default function InviteAccept() {
  const { token } = useParams()
  const navigate = useNavigate()
  const { login } = useAuth()

  usePageTitle('Set your password')

  const [invite, setInvite] = useState(null)
  const [loadError, setLoadError] = useState(null)
  const [form, setForm] = useState({ password: '', confirm: '' })
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false

    invitesApi
      .open(token)
      .then((result) => !cancelled && setInvite(result))
      .catch((err) => !cancelled && setLoadError(err))

    return () => {
      cancelled = true
    }
  }, [token])

  async function onSubmit(event) {
    event.preventDefault()

    if (form.password !== form.confirm) return setError('The two passwords do not match')
    if (form.password.length < 8) return setError('Password must be at least 8 characters')

    setError(null)
    setSaving(true)
    try {
      await invitesApi.accept(token, form.password)
      await login({ email: invite.email, password: form.password })
      navigate(ROUTES.dashboard, { replace: true })
    } catch (err) {
      setError(getErrorMessage(err))
      setSaving(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 p-4 dark:bg-neutral-900">
      <div className="w-full max-w-sm rounded-xl border border-neutral-200 bg-white p-8 dark:border-neutral-700 dark:bg-neutral-800">
        <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          {env.appName}
        </h1>

        {loadError ? (
          <div className="mt-6">
            <ErrorState description={getErrorMessage(loadError)} />
            <Link
              to={ROUTES.login}
              className="mt-4 block text-center text-sm underline underline-offset-2"
            >
              Go to sign in
            </Link>
          </div>
        ) : !invite ? (
          <div className="mt-6 space-y-3">
            <Skeleton height={20} />
            <Skeleton height={60} />
            <Skeleton height={60} />
          </div>
        ) : (
          <>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              Hi {invite.name.split(' ')[0]} — pick a password for {invite.email}
            </p>

            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              <FormField label="New password" htmlFor="password" required>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  required
                />
              </FormField>

              <FormField
                label="Confirm password"
                htmlFor="confirm"
                required
                error={error ?? undefined}
              >
                <Input
                  id="confirm"
                  type="password"
                  autoComplete="new-password"
                  value={form.confirm}
                  onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))}
                  required
                />
              </FormField>

              <Button type="submit" className="w-full" loading={saving}>
                Set password and sign in
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
