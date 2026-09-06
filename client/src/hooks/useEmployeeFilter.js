import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { employeesApi } from '@/api/hr'

// A smart button on the employee form opens a module scoped to that person, so the
// id travels in the URL and the list resolves the name to show what it is filtered to.
export function useEmployeeFilter() {
  const [params, setParams] = useSearchParams()
  const employeeId = params.get('employee')

  const [employee, setEmployee] = useState(null)

  useEffect(() => {
    if (!employeeId) {
      setEmployee(null)
      return
    }

    let cancelled = false
    employeesApi
      .get(employeeId)
      .then(({ employee }) => !cancelled && setEmployee(employee))
      .catch(() => !cancelled && setEmployee(null))

    return () => {
      cancelled = true
    }
  }, [employeeId])

  const clear = () => {
    const next = new URLSearchParams(params)
    next.delete('employee')
    setParams(next, { replace: true })
  }

  return { employeeId, employee, clear }
}
