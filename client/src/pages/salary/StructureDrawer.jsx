import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button, Drawer, ErrorState, FormField, Input, Skeleton } from '@/components/ui'
import { salaryStructuresApi } from '@/api/hr'
import { useNotify } from '@/context/NotificationContext'
import { salaryStructureSchema } from '@/validations/salaryRule'
import { getErrorMessage } from '@/utils/errorUtils'

const EMPTY = { name: '', code: '', description: '', active: true }

export function StructureDrawer({ structureId, onClose, onSaved }) {
  const isNew = structureId === 'new'
  const notify = useNotify()

  const [loading, setLoading] = useState(!isNew)
  const [loadError, setLoadError] = useState(null)

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(salaryStructureSchema), defaultValues: EMPTY })

  useEffect(() => {
    if (isNew) return reset(EMPTY)

    let cancelled = false
    salaryStructuresApi
      .get(structureId)
      .then(({ structure }) => {
        if (cancelled) return
        reset({
          name: structure.name,
          code: structure.code,
          description: structure.description ?? '',
          active: structure.active,
        })
      })
      .catch((err) => !cancelled && setLoadError(err))
      .finally(() => !cancelled && setLoading(false))

    return () => {
      cancelled = true
    }
  }, [structureId, isNew, reset])

  const onSubmit = handleSubmit(async (data) => {
    try {
      const { structure } = isNew
        ? await salaryStructuresApi.create(data)
        : await salaryStructuresApi.update(structureId, data)
      notify.success(isNew ? `${structure.name} created` : 'Changes saved')
      onSaved(structure)
    } catch (err) {
      notify.error(getErrorMessage(err))
    }
  })

  return (
    <Drawer
      isOpen
      onClose={onClose}
      size="sm"
      title={isNew ? 'New salary structure' : watch('name') || 'Salary structure'}
      description="A structure groups the rules that build a payslip."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="structure-form" loading={isSubmitting}>
            {isNew ? 'Create structure' : 'Save changes'}
          </Button>
        </>
      }
    >
      {loading ? (
        <div className="space-y-4">
          <Skeleton height={64} />
          <Skeleton height={64} />
        </div>
      ) : loadError ? (
        <ErrorState description={loadError.message} />
      ) : (
        <form id="structure-form" onSubmit={onSubmit} className="space-y-4">
          <FormField label="Structure Name" htmlFor="name" required error={errors.name?.message}>
            <Input id="name" placeholder="Regular Salary" {...register('name')} />
          </FormField>

          <FormField label="Code" htmlFor="code" required error={errors.code?.message}>
            <Input id="code" placeholder="REG" {...register('code')} />
          </FormField>

          <FormField label="Description" htmlFor="description">
            <Input id="description" {...register('description')} />
          </FormField>

          <FormField label="Status" htmlFor="active">
            <select
              id="active"
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
              {...register('active')}
            >
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </FormField>
        </form>
      )}
    </Drawer>
  )
}
