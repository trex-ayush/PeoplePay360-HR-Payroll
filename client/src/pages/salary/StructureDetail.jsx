import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Pencil, Plus } from 'lucide-react'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  DataTable,
  EmptyState,
  ErrorState,
  Input,
  Skeleton,
} from '@/components/ui'
import { RowActions } from '@/components/RowActions'
import { RuleDrawer } from './RuleDrawer'
import { StructureDrawer } from './StructureDrawer'
import { salaryRulesApi, salaryStructuresApi } from '@/api/hr'
import { useNotify } from '@/context/NotificationContext'
import { usePageTitle } from '@/hooks/usePageTitle'
import { useDrawerRoute } from '@/hooks/useDrawerRoute'
import { getErrorMessage } from '@/utils/errorUtils'
import { RULE_CATEGORIES } from '@/config/constants'

const money = (value) =>
  new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(value ?? 0)

const categoryMeta = (value) => RULE_CATEGORIES.find((c) => c.value === value)

function describeRule(rule) {
  if (rule.computeType === 'fixed') return `Fixed ${rule.amount}`
  if (rule.computeType === 'percent') return `${rule.amount}% of ${rule.baseCode}`
  return rule.expression
}

const ruleColumns = ({ onEdit, onDelete }) => [
  { key: 'sequence', header: 'Seq', width: 70, align: 'right' },
  {
    key: 'code',
    header: 'Code',
    width: 110,
    cell: (row) => <span className="font-mono text-xs font-semibold">{row.code}</span>,
  },
  { key: 'name', header: 'Rule Name' },
  {
    key: 'category',
    header: 'Category',
    cell: (row) => {
      const meta = categoryMeta(row.category)
      return (
        <Badge tone={meta?.tone ?? 'neutral'} size="sm">
          {meta?.label ?? row.category}
        </Badge>
      )
    },
  },
  {
    key: 'computation',
    header: 'Computation',
    cell: (row) => <span className="font-mono text-xs">{describeRule(row)}</span>,
  },
  {
    key: 'actions',
    header: '',
    width: 60,
    align: 'right',
    cell: (row) => <RowActions onEdit={() => onEdit(row)} onDelete={() => onDelete(row)} />,
  },
]

function Detail({ label, children }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-neutral-500">{label}</dt>
      <dd className="mt-1 font-medium text-neutral-900 dark:text-neutral-100">{children}</dd>
    </div>
  )
}

function Preview({ structureId, reloadKey }) {
  const [wage, setWage] = useState(50000)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const run = useCallback(async () => {
    try {
      setResult(await salaryStructuresApi.preview(structureId, wage))
      setError(null)
    } catch (err) {
      setResult(null)
      setError(err)
    }
  }, [structureId, wage])

  useEffect(() => {
    const timer = setTimeout(run, 300)
    return () => clearTimeout(timer)
  }, [run, reloadKey])

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Preview</h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            What a full month on this structure produces.
          </p>
        </div>
        <div className="w-40">
          <Input
            label="Monthly wage"
            type="number"
            min="0"
            value={wage}
            onChange={(e) => setWage(Number(e.target.value))}
          />
        </div>
      </CardHeader>

      <CardBody>
        {error ? (
          <p className="text-sm text-red-600 dark:text-red-400">{getErrorMessage(error)}</p>
        ) : !result ? (
          <Skeleton height={180} />
        ) : (
          <table className="w-full text-sm">
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
              {result.lines.map((line) => (
                <tr key={line.code}>
                  <td className="py-2 font-mono text-xs text-neutral-500">{line.code}</td>
                  <td className="py-2">{line.name}</td>
                  <td className="py-2 text-right tabular-nums">{money(line.amount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-neutral-300 dark:border-neutral-600">
              <tr>
                <td colSpan={2} className="pt-3 font-semibold">
                  Net Salary
                </td>
                <td className="pt-3 text-right text-base font-semibold tabular-nums">
                  {money(result.net)}
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </CardBody>
    </Card>
  )
}

export default function StructureDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const notify = useNotify()

  const [structure, setStructure] = useState(null)
  const [rules, setRules] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [openId, setOpenId] = useDrawerRoute(`/salary-structures/${id}`)

  // One segment carries both drawers on this page: "edit" is the structure form,
  // anything else names a rule.
  const editingStructure = openId === 'edit'
  const openRuleId = editingStructure ? null : openId

  usePageTitle(structure?.name ?? 'Salary structure')

  useEffect(() => {
    let cancelled = false

    salaryStructuresApi
      .get(id)
      .then(({ structure }) => {
        if (cancelled) return
        setStructure(structure)
        setRules(structure.ruleList ?? [])
        setLoadError(null)
      })
      .catch((err) => !cancelled && setLoadError(err))
      .finally(() => !cancelled && setLoading(false))

    return () => {
      cancelled = true
    }
  }, [id, reloadKey])

  async function handleDeleteRule(rule) {
    try {
      await salaryRulesApi.remove(rule._id)
      notify.success(`${rule.code} removed`)
      setReloadKey((k) => k + 1)
    } catch (err) {
      notify.error(getErrorMessage(err))
    }
  }

  if (loading) {
    return (
      <PageContainer>
        <Skeleton height={36} width="35%" className="mb-6" />
        <Skeleton height={320} rounded="lg" />
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

  return (
    <PageContainer>
      <p className="mb-2 text-xs text-neutral-500 dark:text-neutral-400">
        <Link to="/salary-structures" className="hover:underline">
          Salary Structures
        </Link>
        <span className="mx-1.5">/</span>
        {structure.name}
      </p>

      <PageHeader
        title={structure.name}
        description="Rules run in sequence. A later rule can use any code computed before it."
        actions={
          <Button
            variant="secondary"
            iconLeft={<Pencil size={14} />}
            onClick={() => setOpenId('edit')}
          >
            Edit
          </Button>
        }
      />

      <Card className="mb-6">
        <CardBody>
          <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <Detail label="Code">
              <span className="font-mono">{structure.code}</span>
            </Detail>
            <Detail label="Description">{structure.description || '—'}</Detail>
            <Detail label="Employees">{structure.employees}</Detail>
            <Detail label="Status">
              {structure.active ? (
                <Badge tone="success" size="sm" dot>
                  Active
                </Badge>
              ) : (
                <Badge tone="neutral" size="sm">
                  Inactive
                </Badge>
              )}
            </Detail>
          </dl>
        </CardBody>
      </Card>

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Salary Rules</h2>
        <Button
          variant="secondary"
          size="sm"
          iconLeft={<Plus size={14} />}
          onClick={() => setOpenId('new')}
        >
          Add rule
        </Button>
      </div>

      <div className="mb-6">
        <DataTable
          columns={ruleColumns({
            onEdit: (rule) => setOpenId(rule._id),
            onDelete: handleDeleteRule,
          })}
          rows={rules}
          rowKey={(row) => row._id}
          density="compact"
          rounded="lg"
          onRowClick={(rule) => setOpenId(rule._id)}
          emptyState={
            <EmptyState
              title="No rules yet"
              description="Add Basic first, then allowances, then Gross, deductions and Net."
            />
          }
        />
      </div>

      {rules.length ? <Preview structureId={id} reloadKey={reloadKey} /> : null}

      {openRuleId ? (
        <RuleDrawer
          ruleId={openRuleId}
          structureId={id}
          siblings={rules}
          onClose={() => setOpenId(null)}
          onSaved={() => {
            setOpenId(null)
            setReloadKey((k) => k + 1)
          }}
        />
      ) : null}

      {editingStructure ? (
        <StructureDrawer
          structureId={id}
          onClose={() => setOpenId(null)}
          onSaved={() => {
            setOpenId(null)
            setReloadKey((k) => k + 1)
          }}
        />
      ) : null}
    </PageContainer>
  )
}
