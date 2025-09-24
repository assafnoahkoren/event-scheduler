import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { trpc } from '@/utils/trpc'
import { useCurrentOrg } from '@/contexts/CurrentOrgContext'
import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { Plus, Wrench } from 'lucide-react'
import { toast } from 'sonner'
import { EventServiceCard } from './EventServiceCard'
import { ServiceSelectionDrawer } from './ServiceSelectionDrawer'
import type { inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from '@/../../server/src/routers/appRouter'

type RouterOutput = inferRouterOutputs<AppRouter>
type Event = RouterOutput['events']['get']
type ServiceProvider = RouterOutput['serviceProviders']['list'][0]
type ServiceProviderService = ServiceProvider['services'][0]

interface EventServiceSectionProps {
  event: Event
}

export function EventServiceSection({ event }: EventServiceSectionProps) {
  const { t } = useTranslation()
  const { currentOrg } = useCurrentOrg()
  const utils = trpc.useUtils()
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Keep drawer state stable during re-renders
  const drawerOpenRef = useRef(drawerOpen)
  useEffect(() => {
    drawerOpenRef.current = drawerOpen
  }, [drawerOpen])

  // Get available service providers for the organization
  const { data: providers } = trpc.serviceProviders.list.useQuery(
    { organizationId: currentOrg?.id || '' },
    { enabled: !!currentOrg?.id && !!event.siteId }
  )

  // Get existing event providers (services)
  const { data: existingEventProviders } = trpc.eventProviders.list.useQuery(
    { eventId: event.id },
    {
      enabled: !!event.id,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
    }
  )

  const addEventProviderMutation = trpc.eventProviders.add.useMutation({
    onSuccess: () => {
      utils.eventProviders.list.invalidate({ eventId: event.id })
      setDrawerOpen(false)
    },
    onError: (error) => {
      console.error('Failed to add service:', error)
      toast.error(t('events.serviceError'))
    },
  })

  const removeEventProviderMutation = trpc.eventProviders.remove.useMutation({
    onSuccess: () => {
      utils.eventProviders.list.invalidate({ eventId: event.id })
    },
    onError: (error) => {
      console.error('Failed to remove service:', error)
      toast.error(t('events.serviceError'))
    },
  })

  const updateEventProviderMutation = trpc.eventProviders.update.useMutation({
    onSuccess: () => {
      utils.eventProviders.list.invalidate({ eventId: event.id })
    },
    onError: (error) => {
      console.error('Failed to update service:', error)
      toast.error(t('events.serviceError'))
    },
  })

  const handleAddService = (providerId: string, serviceId: string, price?: number, providerPrice?: number) => {
    addEventProviderMutation.mutate({
      eventId: event.id,
      providerId,
      providerServiceId: serviceId,
      price,
      providerPrice,
    })
  }

  const handleRemoveService = (eventProviderId: string) => {
    removeEventProviderMutation.mutate({
      id: eventProviderId,
    })
  }

  const handleUpdateService = (eventProviderId: string, price: number, notes?: string, providerPrice?: number) => {
    updateEventProviderMutation.mutate({
      id: eventProviderId,
      price,
      notes,
      providerPrice,
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">{t('events.eventServices')}</h3>
        <Button onClick={() => setDrawerOpen(true)} size="sm">
          <Plus className="h-4 w-4 me-2" />
          {t('events.addService')}
        </Button>
      </div>

      {existingEventProviders && existingEventProviders.length > 0 ? (
        <div className="grid gap-4">
          {existingEventProviders.map((eventProvider) => (
            <EventServiceCard
              key={eventProvider.id}
              eventProvider={eventProvider}
              onRemove={() => handleRemoveService(eventProvider.id)}
              onUpdate={(price, notes, providerPrice) => handleUpdateService(eventProvider.id, price, notes, providerPrice)}
            />
          ))}
        </div>
      ) : (
        <div className="border-2 border-dashed rounded-lg p-8">
          <div className="flex flex-col items-center justify-center text-center">
            <Wrench className="h-10 w-10 text-muted-foreground mb-4" />
            <h4 className="text-lg font-medium mb-1">{t('events.noServices')}</h4>
            <p className="text-sm text-muted-foreground mb-4">
              {t('events.noServicesDescription')}
            </p>
            <Button onClick={() => setDrawerOpen(true)} size="sm">
              <Plus className="h-4 w-4 me-2" />
              {t('events.addFirstService')}
            </Button>
          </div>
        </div>
      )}

      <ServiceSelectionDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        providers={providers || []}
        onSelectService={handleAddService}
        existingServices={existingEventProviders || []}
      />
    </div>
  )
}