import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge, EmptyState, Skeleton } from '@/components/ui'
import { allocationsApi, timeOffRequestsApi } from '@/api/hr'
import { REQUEST_STATES, ALLOCATION_STATES, MAX_PAGE_SIZE } from '@/config/constants'
import { inUnits } from '@/utils/units'

const day = (value) => new Date(value).toLocaleDateString('en-IN', { dateStyle: 'medium' })

function Rows({ loading, rows, empty, children }) {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} height={56} rounded="lg" />
        ))}
      </div>
    )
  }

  if (!rows.length) return <EmptyState compact title={empty.title} description={empty.description} />

  return <div className="space-y-2">{rows.map(children)}</div>
}

export function TimeOffTab({ employeeId }) {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    timeOffRequestsApi
      .list({ employee: employeeId, pageSize: MAX_PAGE_SIZE })
      .then(({ requests }) => !cancelled && setRequests(requests))
      .catch(() => !cancelled && setRequests([]))
      .finally(() => !cancelled && setLoading(false))

    return () => {
      cancelled = true
    }
  }, [employeeId])

  return (
    <>
      <Rows
        loading={loading}
        rows={requests}
        empty={{
          title: 'No time off yet',
          description: 'Leave they ask for shows up here, whatever its status.',
        }}
      >
        {(request) => {
          const meta = REQUEST_STATES.find((s) => s.value === request.state)

          return (
            <div
              key={request._id}
              className="flex items-center justify-between gap-3 rounded-lg border border-neutral-200 px-4 py-3 dark:border-neutral-700"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium">{request.type?.name}</p>
                <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                  {day(request.dateFrom)} → {day(request.dateTo)}
                </p>
              </div>
              <div className="flex flex-shrink-0 items-center gap-3">
                <span className="text-sm tabular-nums">
                  {inUnits(request.duration, request.type?.unit)}
                </span>
                <Badge tone={meta?.tone ?? 'neutral'} size="sm">
                  {meta?.label ?? request.state}
                </Badge>
              </div>
            </div>
          )
        }}
      </Rows>

      <Link
        to={`/time-off/requests?employee=${employeeId}`}
        className="mt-3 inline-block text-sm text-neutral-500 hover:underline dark:text-neutral-400"
      >
        View all in Time Off
      </Link>
    </>
  )
}

export function AllocationsTab({ employeeId }) {
  const [allocations, setAllocations] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    allocationsApi
      .list({ employee: employeeId, pageSize: MAX_PAGE_SIZE })
      .then(({ allocations }) => !cancelled && setAllocations(allocations))
      .catch(() => !cancelled && setAllocations([]))
      .finally(() => !cancelled && setLoading(false))

    return () => {
      cancelled = true
    }
  }, [employeeId])

  return (
    <>
      <Rows
        loading={loading}
        rows={allocations}
        empty={{
          title: 'No leave allocated',
          description: 'Until HR grants a balance, no leave that needs one can be approved.',
        }}
      >
        {(allocation) => {
          const meta = ALLOCATION_STATES.find((s) => s.value === allocation.state)
          const unit = allocation.type?.unit ?? 'days'

          return (
            <div
              key={allocation._id}
              className="rounded-lg border border-neutral-200 px-4 py-3 dark:border-neutral-700"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium">{allocation.type?.name}</p>
                <Badge tone={meta?.tone ?? 'neutral'} size="sm">
                  {meta?.label ?? allocation.state}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                {day(allocation.validFrom)} → {day(allocation.validTo)}
              </p>
              <div className="mt-2 flex flex-wrap gap-x-5 text-xs tabular-nums">
                <span>
                  Accrued <span className="font-medium">{allocation.accrued}</span>
                </span>
                <span>
                  Taken <span className="font-medium">{allocation.taken}</span>
                </span>
                <span>
                  Available <span className="font-semibold">{allocation.available}</span> {unit}
                </span>
              </div>
            </div>
          )
        }}
      </Rows>

      <Link
        to={`/time-off/allocations?employee=${employeeId}`}
        className="mt-3 inline-block text-sm text-neutral-500 hover:underline dark:text-neutral-400"
      >
        View all in Allocations
      </Link>
    </>
  )
}
