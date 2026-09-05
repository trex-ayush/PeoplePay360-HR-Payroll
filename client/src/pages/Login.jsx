import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button, FormField, Input } from '@/components/ui'
import { useAuth } from '@/context/AuthContext'
import { useNotify } from '@/context/NotificationContext'
import { usePageTitle } from '@/hooks/usePageTitle'
import { loginSchema } from '@/validations/auth'
import { getErrorMessage } from '@/utils/errorUtils'

export default function Login() {
  usePageTitle('Sign in')
  const { login } = useAuth()
  const notify = useNotify()
  const navigate = useNavigate()
  const location = useLocation()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = handleSubmit(async (data) => {
    try {
      await login(data)
      navigate(location.state?.from || '/', { replace: true })
    } catch (err) {
      notify.error(getErrorMessage(err))
    }
  })

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950 p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary-500 flex items-center justify-center text-white font-bold">
            P
          </div>
        </div>

        <p className="text-center text-xs font-medium uppercase tracking-wider text-primary-500">
          HR Portal
        </p>
        <h1 className="mt-2 text-center text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
          Welcome back
        </h1>
        <p className="mt-1 text-center text-sm text-neutral-500 dark:text-neutral-400">
          Sign in to continue to your workspace.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
          <FormField label="Work Email" htmlFor="email" required error={errors.email?.message}>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="name@company.com"
              error={Boolean(errors.email)}
              {...register('email')}
            />
          </FormField>

          <FormField label="Password" htmlFor="password" required error={errors.password?.message}>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              error={Boolean(errors.password)}
              {...register('password')}
            />
          </FormField>

          <Button type="submit" fullWidth loading={isSubmitting}>
            Sign In
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-neutral-500 dark:text-neutral-400">
          Accounts are created by an administrator.
        </p>
      </div>
    </div>
  )
}
