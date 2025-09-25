import { memo } from 'react'
import { ClientCard } from '@/components/ClientCard'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { trpc } from '@/utils/trpc'
import type { inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from '../../../server/src/routers/appRouter'

type RouterOutput = inferRouterOutputs<AppRouter>
type ClientSearchResult = RouterOutput['clients']['search'][0]

interface ClientListProps {
  organizationId: string
  searchQuery: string
  onEdit: (client: ClientSearchResult) => void
  onDelete: (client: ClientSearchResult) => void
  onNewClient: () => void
}

export const ClientList = memo(function ClientList({
  organizationId,
  searchQuery,
  onEdit,
  onDelete,
  onNewClient
}: ClientListProps) {
  const { t } = useTranslation()

  // Fetch clients
  const { data: clients, isLoading } = trpc.clients.search.useQuery(
    {
      organizationId: organizationId,
      query: searchQuery,
      limit: 50
    },
    { enabled: !!organizationId }
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div>{t('common.loading')}</div>
      </div>
    )
  }

  const displayedClients = clients || []

  if (displayedClients.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <p className="text-muted-foreground text-center">
            {searchQuery ? t('clients.noClientsFound') : t('clients.noClients')}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {displayedClients.map((client) => (
        <ClientCard
          key={client.id}
          client={client}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
})