import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Pencil } from 'lucide-react'
import {
  Button,
  CodeInput,
  Drawer,
  ErrorState,
  FormField,
  Input,
  ReadOnlyField,
  Skeleton,
} from '@/components/ui'
import { salaryRulesApi } from '@/api/hr'
import { useNotify } from '@/context/NotificationContext'
import { salaryRuleSchema } from '@/validations/salaryRule'
import { getErrorMessage } from '@/utils/errorUtils'
import { COMPUTE_TYPES, RULE_CATEGORIES } from '@/config/constants'

const BUILT_IN = [
  { code: 'WAGE', label: 'Contract wage' },
  { code: 'RATIO', label: 'Worked days ÷ total days' },
  { code: 'WORKED_DAYS', label: 'Days worked' },
  { code: 'TOTAL_WORKING_DAYS', label: 'Days in the period' },
]

const COMPUTE_HELP = {
  fixed: 'The exact value entered here, for example a meal allowance of 2,000.',
  percent: 'A percentage of a code computed earlier, for example HRA = 40% of BASIC.',
  formula: 'Arithmetic over codes computed earlier, for example BASIC + HRA + DA.',
}

const emptyRule = (structureId, nextSequence) => ({
  structure: structureId,
  name: '',
  code: '',
  category: 'ALW',
  sequence: nextSequence,
  computeType: 'fixed',
  amount: 0,
  baseCode: '',
  expression: '',
  quantity: 1,
})

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

function describe(rule) {
  if (rule.computeType === 'fixed') return `Fixed ${rule.amount}`
  if (rule.computeType === 'percent') return `${rule.amount}% of ${rule.baseCode}`
  return rule.expression
}

export function RuleDrawer({ ruleId, structureId, siblings = [], onClose, onSaved }) {
  const isNew = ruleId === 'new'
  const notify = useNotify()

  const [loading, setLoading] = useState(!isNew)
  const [loadError, setLoadError] = useState(null)
  const [editing, setEditing] = useState(isNew)

  const nextSequence = siblings.length
    ? Math.max(...siblings.map((r) => r.sequence)) + 10
    : 10

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(salaryRuleSchema),
    defaultValues: emptyRule(structureId, nextSequence),
  })

  const computeType = watch('computeType')
  const sequence = Number(watch('sequence'))
  const code = watch('code')

  useEffect(() => {
    if (isNew) {
      reset(emptyRule(structureId, nextSequence))
      return
    }

    let cancelled = false
    salaryRulesApi
      .get(ruleId)
      .then(({ rule }) => {
        if (cancelled) return
        reset({
          ...emptyRule(structureId, nextSequence),
          ...rule,
          structure: rule.structure?._id ?? structureId,
        })
      })
      .catch((err) => !cancelled && setLoadError(err))
      .finally(() => !cancelled && setLoading(false))

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ruleId, isNew, structureId, reset])

  const available = siblings
    .filter((r) => r._id !== ruleId && r.sequence < sequence)
    .sort((a, b) => a.sequence - b.sequence)

  // What the formula autocomplete offers: built-in values plus every rule
  // sequenced before this one.
  const suggestions = [
    ...BUILT_IN,
    ...available.map((rule) => ({ code: rule.code, label: rule.name })),
  ]

  const onSubmit = handleSubmit(async (data) => {
    try {
      if (isNew) {
        const { rule } = await salaryRulesApi.create(data)
        notify.success(`${rule.code} added`)
      } else {
        await salaryRulesApi.update(ruleId, data)
        notify.success('Changes saved')
        setEditing(false)
      }
      onSaved()
    } catch (err) {
      notify.error(getErrorMessage(err))
    }
  })

  return (
    <Drawer
      isOpen
      onClose={onClose}
      size="md"
      title={isNew ? 'New salary rule' : code || 'Salary rule'}
      description="One rule is one line on the payslip."
      footer={
        editing ? (
          <>
            <Button key="cancel" variant="secondary" onClick={isNew ? onClose : () => setEditing(false)}>
              Cancel
            </Button>
            <Button key="save" type="submit" form="rule-form" loading={isSubmitting}>
              {isNew ? 'Add rule' : 'Save changes'}
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
          <Skeleton height={120} />
        </div>
      ) : loadError ? (
        <ErrorState description={loadError.message} />
      ) : !editing ? (
        <div className="grid gap-5 sm:grid-cols-2">
          <ReadOnlyField label="Rule Name">{watch('name')}</ReadOnlyField>
          <ReadOnlyField label="Code">
            <span className="font-mono">{watch('code')}</span>
          </ReadOnlyField>
          <ReadOnlyField label="Category">
            {RULE_CATEGORIES.find((c) => c.value === watch('category'))?.label}
          </ReadOnlyField>
          <ReadOnlyField label="Sequence">{watch('sequence')}</ReadOnlyField>
          <ReadOnlyField label="Method">
            {COMPUTE_TYPES.find((t) => t.value === computeType)?.label}
          </ReadOnlyField>
          <ReadOnlyField label="Quantity">{watch('quantity')}</ReadOnlyField>
          <div className="sm:col-span-2">
            <ReadOnlyField label="Computation">
              <span className="font-mono">
                {describe({
                  computeType,
                  amount: watch('amount'),
                  baseCode: watch('baseCode'),
                  expression: watch('expression'),
                })}
              </span>
            </ReadOnlyField>
          </div>
        </div>
      ) : (
        <form id="rule-form" onSubmit={onSubmit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Rule Name" htmlFor="name" required error={errors.name?.message}>
              <Input id="name" placeholder="House Rent Allowance" {...register('name')} />
            </FormField>

            <FormField
              label="Code"
              htmlFor="code"
              required
              error={errors.code?.message}
              hint="Other rules reference this"
            >
              <Input id="code" placeholder="HRA" {...register('code')} />
            </FormField>

            <Select
              label="Category"
              htmlFor="category"
              required
              error={errors.category?.message}
              {...register('category')}
            >
              {RULE_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>

            <FormField
              label="Sequence"
              htmlFor="sequence"
              required
              error={errors.sequence?.message}
              hint="Lower runs first"
            >
              <Input id="sequence" type="number" min="0" step="10" {...register('sequence')} />
            </FormField>
          </div>

          <div className="space-y-4 rounded-lg border border-neutral-200 p-4 dark:border-neutral-700">
            <div className="grid gap-4 sm:grid-cols-2">
              <Select label="Method" htmlFor="computeType" required {...register('computeType')}>
                {COMPUTE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Select>

              {computeType === 'formula' ? null : (
                <FormField
                  label={computeType === 'percent' ? 'Percentage' : 'Amount'}
                  htmlFor="amount"
                  required
                  error={errors.amount?.message}
                  hint={computeType === 'percent' ? 'Negative for a deduction' : undefined}
                >
                  <Input id="amount" type="number" step="0.01" {...register('amount')} />
                </FormField>
              )}
            </div>

            {computeType === 'percent' ? (
              <Select
                label="Percentage of"
                htmlFor="baseCode"
                required
                error={errors.baseCode?.message}
                {...register('baseCode')}
              >
                <option value="">Select base</option>
                {BUILT_IN.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.code} — {item.label}
                  </option>
                ))}
                {available.map((rule) => (
                  <option key={rule.code} value={rule.code}>
                    {rule.code} — {rule.name}
                  </option>
                ))}
              </Select>
            ) : null}

            {computeType === 'formula' ? (
              <FormField
                label="Formula"
                htmlFor="expression"
                required
                error={errors.expression?.message}
                hint="Start typing a code — suggestions appear as you go"
              >
                <CodeInput
                  id="expression"
                  placeholder="BASIC + HRA + DA"
                  codes={suggestions}
                  value={watch('expression') ?? ''}
                  onChange={(next) => setValue('expression', next, { shouldValidate: true })}
                />
              </FormField>
            ) : null}

            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {COMPUTE_HELP[computeType]}
            </p>
          </div>

          <FormField
            label="Quantity"
            htmlFor="quantity"
            error={errors.quantity?.message}
            hint="Multiplies the result — leave at 1 unless the rule is per day or per unit"
          >
            <Input id="quantity" type="number" min="0" step="0.01" {...register('quantity')} />
          </FormField>
        </form>
      )}
    </Drawer>
  )
}
