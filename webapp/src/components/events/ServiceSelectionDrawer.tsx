import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Search, Plus, Check, Coins } from 'lucide-react'
import type { inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from '@/../../server/src/routers/appRouter'

type RouterOutput = inferRouterOutputs<AppRouter>
type ServiceProvider = RouterOutput['serviceProviders']['list'][0]
type ServiceProviderService = ServiceProvider['services'][0]

interface ServiceSelectionDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  providers: ServiceProvider[]
  onSelectService: (providerId: string, serviceId: string, price?: number, providerPrice?: number) => void
  existingServices?: any[] // Optional prop to prevent type errors
}

export function ServiceSelectionDrawer({
  open,
  onOpenChange,
  providers,
  onSelectService,
  existingServices,
}: ServiceSelectionDrawerProps) {
  const { t } = useTranslation()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedService, setSelectedService] = useState<{
    providerId: string
    serviceId: string
    price?: number
  } | null>(null)
  const [customPrice, setCustomPrice] = useState<number | undefined>()
  const [providerPrice, setProviderPrice] = useState<number>(0)
  const [isSelecting, setIsSelecting] = useState(false)

  // Reset state when drawer closes
  useEffect(() => {
    if (!open) {
      setSelectedService(null)
      setCustomPrice(undefined)
      setProviderPrice(0)
      setSearchQuery('')
    }
  }, [open])

  const filteredProviders = providers.filter(provider => {
    const matchesSearch = searchQuery === '' ||
      provider.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      provider.services.some(service =>
        (service.category?.name || service.name || '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    const hasServices = provider.services.length > 0
    return matchesSearch && hasServices
  })

  const handleSelectService = (provider: ServiceProvider, service: ServiceProviderService) => {
    setIsSelecting(true)
    // If clicking on the already selected service, deselect it
    if (selectedService?.serviceId === service.id) {
      setSelectedService(null)
      setCustomPrice(undefined)
    } else {
      // Select the new service
      setSelectedService({
        providerId: provider.id,
        serviceId: service.id,
        price: service.price || undefined,
      })
      setCustomPrice(service.price || undefined)
    }
    setTimeout(() => setIsSelecting(false), 100)
  }

  const handleAddService = () => {
    if (selectedService) {
      onSelectService(
        selectedService.providerId,
        selectedService.serviceId,
        customPrice,
        providerPrice || 0
      )
      setSelectedService(null)
      setCustomPrice(undefined)
      setProviderPrice(0)
      setSearchQuery('')
    }
  }

  const formatPrice = (price?: number | null, currency?: string | null) => {
    if (!price) return t('serviceProviders.noPriceSet')
    const curr = currency || 'ILS'
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: curr,
      }).format(price)
    } catch {
      return `${curr} ${price.toFixed(2)}`
    }
  }

  return (
    <Drawer
      open={open}
      onOpenChange={(newOpen) => {
        // Prevent closing while selecting
        if (!newOpen && isSelecting) return
        onOpenChange(newOpen)
      }}
      noBodyStyles
      disablePreventScroll
    >
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader>
          <DrawerTitle>{t('events.selectService')}</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-4">
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('events.searchServices')}
                className="ps-9"
              />
            </div>

            <div className="max-h-[400px] overflow-y-auto space-y-3">
              {filteredProviders.length > 0 ? (
                filteredProviders.map((provider) => (
                  <div key={provider.id}>
                    <h4 className="font-medium mb-2">{provider.name}</h4>
                    <div className="grid gap-2">
                      {provider.services.map((service) => {
                        const isSelected = selectedService?.serviceId === service.id

                        return (
                          <Card
                            key={service.id}
                            className={`cursor-pointer transition-colors ${
                              isSelected ? 'ring-2 ring-primary' : ''
                            }`}
                            onClick={() => handleSelectService(provider, service)}
                          >
                            <CardHeader className="pb-3">
                              <div className="flex items-center justify-between">
                                <div>
                                  <CardTitle className="text-sm">
                                    {service.category?.name || service.name}
                                  </CardTitle>
                                  {service.category?.description && (
                                    <CardDescription className="text-xs mt-1">
                                      {service.category.description}
                                    </CardDescription>
                                  )}
                                </div>
                                {isSelected && (
                                  <Check className="h-5 w-5 text-primary" />
                                )}
                              </div>
                            </CardHeader>
                            <CardContent className="pt-0">
                              <div className="flex items-center gap-2 text-sm">
                                <Coins className="w-4 h-4 text-gray-400" />
                                <span>{formatPrice(service.price, service.currency)}</span>
                              </div>
                            </CardContent>
                          </Card>
                        )
                      })}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  {searchQuery ? t('events.noServicesFound') : t('events.noServicesAvailable')}
                </div>
              )}
            </div>

            {selectedService && (
              <div className="border-t pt-4 space-y-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    {t('events.customPrice')} ({t('common.optional')})
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={customPrice || ''}
                      onChange={(e) => setCustomPrice(parseFloat(e.target.value) || undefined)}
                      placeholder={t('events.useDefaultPrice')}
                      step="0.01"
                      min="0"
                    />
                    <span className="text-sm text-muted-foreground">ILS</span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    {t('events.providerPrice')} ({t('common.optional')})
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={providerPrice || ''}
                      onChange={(e) => setProviderPrice(parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      step="0.01"
                      min="0"
                    />
                    <span className="text-sm text-muted-foreground">ILS</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleAddService} className="flex-1">
                    <Plus className="h-4 w-4 me-2" />
                    {t('events.addService')}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedService(null)
                      setCustomPrice(undefined)
                      setProviderPrice(0)
                    }}
                  >
                    {t('common.cancel')}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  )
}