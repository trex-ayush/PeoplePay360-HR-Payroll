import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search } from 'lucide-react'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge, DataTable, EmptyState, Input } from '@/components/ui'
import { salaryRulesApi } from '@/api/hr'
import { usePageTitle } from '@/hooks/usePageTitle'
import { RULE_CATEGORIES } from '@/config/constants'

const categoryMeta = (value) => RULE_CATEGORIES.find((c) => c.value === value)

function describeRule(rule) {
  if (rule.computeType === 'fixed') return `Fixed ${rule.amount}`
  if (rule.computeType === 'percent') return `${rule.amount}% of ${rule.baseCode}`
  return rule.expression
}

const columns = [
  { key: 'name', header: 'Rule Name', cell: (row) => <span className="font-medium">{row.name}</span> },
  {
    key: 'code',
    header: 'Code',
    width: 110,
    cell: (row) => <span className="font-mono text-xs font-semibold">{row.code}</span>,
  },
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
    key: 'structure',
    header: 'Structure',
    cell: (row) =>
      row.structure ? (
        <Link
          to={`/salary-structures/${row.structure._id}`}
          onClick={(e) => e.stopPropagation()}
          className="text-neutral-900 underline-offset-2 hover:underline dark:text-neutral-100"
        >
          {row.structure.name}
        </Link>
      ) : (
        '—'
      ),
  },
  { key: 'sequence', header: 'Sequence', width: 90, align: 'right' },
  {
    key: 'computation',
    header: 'Computation',
    cell: (row) => <span className="font-mono text-xs">{describeRule(row)}</span>,
  },
]

export default function RulesList() {
  usePageTitle('Salary Rules')

  const [rules, setRules] = useState([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)
  const [meta, setMeta] = useState(null)

  useEffect(() => {
    let cancelled = false
    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const { rules, ...meta } = await salaryRulesApi.list({ search, category, page })
        if (!cancelled) {
          setRules(rules)
          setMeta(meta)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) setError(err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, search ? 250 : 0)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [search, category, page])

  return (
    <PageContainer>
      <PageHeader
        title="Salary Rules"
        description="Every rule across all structures, in the order it runs. Rules are created and edited inside their own structure."
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="max-w-sm flex-1">
          <Input
            placeholder="Search salary rules…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            iconLeft={<Search size={16} />}
          />
        </div>

        <select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value)
            setPage(1)
          }}
          className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
        >
          <option value="">All categories</option>
          {RULE_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <DataTable
        columns={columns}
        rows={rules}
        rowKey={(row) => row._id}
        loading={loading}
        error={error}
        rounded="lg"
        pagination={meta ? { ...meta, onPageChange: setPage } : undefined}
        emptyState={
          <EmptyState
            title={search ? `No rules match “${search}”` : 'No salary rules yet'}
            description="Open a salary structure to add the rules that build its payslips."
          />
        }
      />
    </PageContainer>
  )
}
