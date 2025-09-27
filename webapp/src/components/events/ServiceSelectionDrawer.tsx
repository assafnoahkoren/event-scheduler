import { useState, useEffect, useMemo } from 'react'
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Search, Plus, Check, Coins } from 'lucide-react'
import { toast } from 'sonner'
import type { inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from '@/../../server/src/routers/appRouter'

type RouterOutput = inferRouterOutputs<AppRouter>
type ServiceProvider = RouterOutput['serviceProviders']['list'][0]
type ServiceProviderService = ServiceProvider['services'][0]
type ServiceCategory = RouterOutput['serviceProviders']['listCategories'][0]

interface ServiceSelectionDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  providers: ServiceProvider[]
  categories: ServiceCategory[]
  onSelectService: (providerId: string, serviceId: string, price?: number, providerPrice?: number) => void
  existingServices?: any[] // Optional prop to prevent type errors
}

export function ServiceSelectionDrawer({
  open,
  onOpenChange,
  providers,
  categories,
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

  // Reset state when drawer closes
  useEffect(() => {
    if (!open) {
      setSelectedService(null)
      setSearchQuery('')
    }
  }, [open])

  // Group services by category with search filtering
  const groupedServices = useMemo(() => {
    const grouped = new Map<string | null, {
      category: ServiceCategory | null,
      services: Array<ServiceProviderService & { provider: ServiceProvider }>
    }>()

    // Collect all services from all providers
    const allServices: Array<ServiceProviderService & { provider: ServiceProvider }> = []
    providers.forEach(provider => {
      provider.services.forEach(service => {
        allServices.push({ ...service, provider })
      })
    })

    // Filter services based on search query
    const filteredServices = allServices.filter(service => {
      if (!searchQuery) return true
      const query = searchQuery.toLowerCase()

      const serviceMatch = service.name?.toLowerCase().includes(query) ||
                          service.category?.name?.toLowerCase().includes(query) ||
                          service.provider.name.toLowerCase().includes(query)

      return serviceMatch
    })

    // Initialize with all categories
    if (!searchQuery) {
      categories.forEach(category => {
        grouped.set(category.id, { category, services: [] })
      })
      // Add uncategorized group
      grouped.set(null, { category: null, services: [] })
    }

    // Group services by their category
    filteredServices.forEach(service => {
      const categoryId = service.categoryId
      if (!grouped.has(categoryId)) {
        const category = categories.find(cat => cat.id === categoryId) || null
        grouped.set(categoryId, { category, services: [] })
      }
      grouped.get(categoryId)!.services.push(service)
    })

    // Convert map to array and filter out empty groups (unless no search)
    return Array.from(grouped.values()).filter(group =>
      !searchQuery || group.services.length > 0
    )
  }, [providers, categories, searchQuery])

  const handleSelectService = (provider: ServiceProvider, service: ServiceProviderService) => {
    // If clicking on the already selected service, deselect it
    if (selectedService?.serviceId === service.id) {
      setSelectedService(null)
    } else {
      // Select the new service
      setSelectedService({
        providerId: provider.id,
        serviceId: service.id,
        price: service.price || undefined,
      })
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
      onOpenChange={onOpenChange}
      noBodyStyles
      disablePreventScroll
    >
      <DrawerContent className="flex flex-col">
        <DrawerHeader className="flex-shrink-0">
          <DrawerTitle>{t('events.selectService')}</DrawerTitle>
        </DrawerHeader>
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="px-4 pb-2 flex-shrink-0">
            <div className="relative">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('events.searchServices')}
                className="ps-9"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-4">
              {groupedServices.length > 0 ? (
                <Accordion type="multiple" className="w-full">
                  {groupedServices.map((group, index) => (
                    <AccordionItem
                      key={group.category?.id || 'uncategorized'}
                      value={group.category?.id || 'uncategorized'}
                      className="border-0"
                    >
                      <AccordionTrigger className={`px-4 py-5 hover:no-underline ${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}>
                        <div className="flex items-center justify-between w-full me-4">
                          <h3 className="text-lg font-semibold">
                            {group.category?.name || t('serviceProviders.uncategorized')}
                          </h3>
                          <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                            {group.services.length} {group.services.length === 1 ? t('products.service') : t('events.services')}
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-4">
                        <div className="grid gap-3 mt-2">
                          {group.services.map((service) => {
                            const isSelected = selectedService?.serviceId === service.id

                            return (
                              <Card
                                key={service.id}
                                className={`cursor-pointer transition-colors ${
                                  isSelected ? 'ring-2 ring-primary' : ''
                                }`}
                                onClick={() => handleSelectService(service.provider, service)}
                              >
                                <CardHeader className="pb-3">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <CardTitle className="text-sm">
                                        {service.name || service.category?.name}
                                      </CardTitle>
                                      <CardDescription className="text-xs mt-1">
                                        {service.provider.name}
                                      </CardDescription>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Button
                                        size="sm"
                                        variant={isSelected ? "default" : "outline"}
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          if (!isSelected) {
                                            handleSelectService(service.provider, service)
                                          }
                                          // Add service directly without the pricing form
                                          onSelectService(
                                            service.provider.id,
                                            service.id,
                                            service.price || undefined,
                                            service.providerPrice || 0
                                          )
                                          toast.success(t('events.serviceAdded'))
                                        }}
                                      >
                                        <Plus className="h-4 w-4 me-1" />
                                        {t('common.add')}
                                      </Button>
                                    </div>
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
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  {searchQuery ? t('events.noServicesFound') : t('events.noServicesAvailable')}
                </div>
              )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  )
}