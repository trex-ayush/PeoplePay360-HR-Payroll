import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button, FormField, Input } from '@/components/ui'
import { useAuth } from '@/context/AuthContext'
import { useNotify } from '@/context/NotificationContext'
import { usePageTitle } from '@/hooks/usePageTitle'
import { loginSchema } from '@/validations/auth'
import { getErrorMessage } from '@/utils/errorUtils'
import { env } from '@/config/env'

const HIGHLIGHTS = [
  'Employees, contracts and departments in one record',
  'Attendance and time off that feed straight into payroll',
  'Payruns computed from your own salary rules',
]

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
    <div className="flex h-screen overflow-hidden">
      {/* The brand panel stays light in both themes — the illustration carries a
          near-white background of its own and only reads on a light surface. */}
      <div className="hidden w-1/2 flex-col justify-between bg-[#f4f7fc] lg:flex">
        <div className="flex items-center gap-2.5 px-12 pt-10">
          <img src="/logo.png" alt="" className="h-8 w-auto" />
          <span className="text-lg font-semibold text-neutral-900">{env.appName}</span>
        </div>

        <div className="px-12">
          <h2 className="text-[32px] font-semibold leading-tight text-neutral-900">
            Simpler HR.
            <br />
            Happier teams.
          </h2>
          <ul className="mt-6 space-y-2.5">
            {HIGHLIGHTS.map((item) => (
              <li key={item} className="flex gap-2.5 text-sm text-neutral-600">
                <span className="mt-[7px] h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary-500" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <img
          src="/login-illustration.png"
          alt=""
          className="w-full flex-shrink-0"
        />
      </div>

      <div className="flex flex-1 items-center justify-center overflow-y-auto bg-white p-6 dark:bg-neutral-950">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <img src="/logo.png" alt="" className="h-8 w-auto" />
            <span className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              {env.appName}
            </span>
          </div>

          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
            Welcome back
          </h1>
          <p className="mt-1.5 text-sm text-neutral-500 dark:text-neutral-400">
            Sign in to continue to your workspace.
          </p>

          <form onSubmit={onSubmit} className="mt-8 space-y-4" noValidate>
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

            <FormField
              label="Password"
              htmlFor="password"
              required
              error={errors.password?.message}
            >
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                error={Boolean(errors.password)}
                {...register('password')}
              />
            </FormField>

            <Button type="submit" fullWidth size="lg" loading={isSubmitting}>
              Sign In
            </Button>
          </form>

          <p className="mt-8 border-t border-neutral-100 pt-5 text-xs text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
            Accounts are created by an administrator. Reach out to your HR admin if you cannot get
            in.
          </p>
        </div>
      </div>
    </div>
  )
}
