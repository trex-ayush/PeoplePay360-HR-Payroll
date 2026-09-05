import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardBody } from '@/components/ui'
import { useAuth } from '@/context/AuthContext'
import { usePageTitle } from '@/hooks/usePageTitle'

export default function Dashboard() {
  usePageTitle('Home')
  const { user } = useAuth()

  return (
    <PageContainer>
      <PageHeader title="Home" description={`Signed in as ${user.email}`} />
      <Card>
        <CardBody>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            The Payroll Dashboard lands in P8, once payruns and payslips exist.
          </p>
        </CardBody>
      </Card>
    </PageContainer>
  )
}
