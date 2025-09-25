import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { trpc } from '@/utils/trpc'
import { useCurrentSite } from '@/contexts/CurrentSiteContext'
import { useCurrentOrg } from '@/contexts/CurrentOrgContext'
import { Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from '@/components/ui/drawer'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { ServiceProviderCard } from '@/components/ServiceProviderCard'
import { ServiceProviderServiceForm } from '@/components/ServiceProviderServiceForm'
import { ServiceProviderServicesManager } from '@/components/ServiceProviderServicesManager'
import { CategorySelect } from '@/components/CategorySelect'
import { CreateServiceProviderButton } from '@/components/CreateServiceProviderButton'
import type { inferRouterOutputs, inferRouterInputs } from '@trpc/server'
import type { AppRouter } from '../../../server/src/routers/appRouter'

type RouterOutput = inferRouterOutputs<AppRouter>
type RouterInput = inferRouterInputs<AppRouter>
type ServiceProvider = RouterOutput['serviceProviders']['list'][0]
type ServiceCategory = RouterOutput['serviceProviders']['listCategories'][0]
type ServiceProviderService = ServiceProvider['services'][0]

// Use tRPC inferred types instead of hard-coded interfaces
type ServiceProviderFormData = Omit<RouterInput['serviceProviders']['create'], 'organizationId'>
type ServiceFormData = Omit<RouterInput['serviceProviders']['addService'], 'serviceProviderId'>

function ServiceProviderForm({
  provider,
  prefilledCategoryId,
  onSubmit,
  onCancel,
  isSubmitting,
}: {
  provider?: ServiceProvider | null
  prefilledCategoryId?: string
  onSubmit: (data: ServiceProviderFormData) => void
  onCancel: () => void
  isSubmitting: boolean
}) {
  const { t } = useTranslation()
  const [formData, setFormData] = useState<ServiceProviderFormData>({
    name: provider?.name || '',
    phone: provider?.phone || '',
    email: provider?.email || '',
    notes: provider?.notes || '',
    categoryId: provider?.categoryId || prefilledCategoryId || undefined,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const submitData = {
      ...formData,
      email: formData.email || undefined,
      phone: formData.phone || undefined,
      notes: formData.notes || undefined,
      categoryId: formData.categoryId || undefined,
    }
    onSubmit(submitData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium">{t('serviceProviders.name')}</label>
        <Input
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder={t('serviceProviders.namePlaceholder')}
          required
        />
      </div>

      <CategorySelect
        value={formData.categoryId}
        onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
        label={t('serviceProviders.serviceCategory')}
        allowClear={true}
        disabled={isSubmitting}
      />

      <div>
        <label className="text-sm font-medium">{t('serviceProviders.phone')} ({t('common.optional')})</label>
        <Input
          type="tel"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          placeholder={t('serviceProviders.phonePlaceholder')}
        />
      </div>

      <div>
        <label className="text-sm font-medium">{t('serviceProviders.email')} ({t('common.optional')})</label>
        <Input
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder={t('serviceProviders.emailPlaceholder')}
        />
      </div>

      <div>
        <label className="text-sm font-medium">{t('serviceProviders.notes')}</label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder={t('serviceProviders.notesPlaceholder')}
          className="w-full px-3 py-2 border rounded-md"
          rows={3}
        />
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {provider ? t('common.update') : t('common.create')}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          {t('common.cancel')}
        </Button>
      </div>
    </form>
  )
}

export function ServiceProviders() {
  const { t } = useTranslation()
  const { currentSite } = useCurrentSite()
  const { currentOrg } = useCurrentOrg()
  const [searchQuery, setSearchQuery] = useState('')
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState<ServiceProvider | null>(null)
  const [isServiceDrawerOpen, setIsServiceDrawerOpen] = useState(false)
  const [providerForService, setProviderForService] = useState<ServiceProvider | null>(null)
  const [editingService, setEditingService] = useState<ServiceProviderService | null>(null)
  const [isServicesManagerOpen, setIsServicesManagerOpen] = useState(false)
  const [managingProvider, setManagingProvider] = useState<ServiceProvider | null>(null)
  const [prefilledCategoryId, setPrefilledCategoryId] = useState<string | undefined>(undefined)

  const utils = trpc.useUtils()

  // Fetch providers
  const { data: providers = [], isLoading } = trpc.serviceProviders.list.useQuery(
    { organizationId: currentOrg?.id || '', search: searchQuery },
    { enabled: !!currentOrg?.id }
  )

  // Fetch categories
  const { data: categories = [] } = trpc.serviceProviders.listCategories.useQuery(
    { organizationId: currentOrg?.id || '' },
    { enabled: !!currentOrg?.id }
  )

  // Group providers by category with smart search filtering
  const groupedProviders = useMemo(() => {
    const grouped = new Map<string | null, { category: ServiceCategory | null, providers: ServiceProvider[] }>()

    // Filter providers based on search query
    const filteredProviders = providers.filter(provider => {
      if (!searchQuery) return true
      const query = searchQuery.toLowerCase()

      // Search in provider fields
      const providerMatch = provider.name.toLowerCase().includes(query) ||
                           provider.phone?.toLowerCase().includes(query) ||
                           provider.email?.toLowerCase().includes(query) ||
                           provider.notes?.toLowerCase().includes(query)

      // Search in category name
      const providerCategory = categories.find(cat => cat.id === provider.categoryId)
      const categoryMatch = providerCategory?.name?.toLowerCase().includes(query)

      return providerMatch || categoryMatch
    })

    // Initialize with all categories (but only if search is empty or they have matching providers)
    if (!searchQuery) {
      // Show all categories when no search
      categories.forEach(category => {
        grouped.set(category.id, { category, providers: [] })
      })
      // Add uncategorized group
      grouped.set(null, { category: null, providers: [] })
    } else {
      // Only initialize categories that will have matching providers
      const categoriesWithMatches = new Set<string | null>()
      filteredProviders.forEach(provider => {
        categoriesWithMatches.add(provider.categoryId || null)
      })

      categoriesWithMatches.forEach(categoryId => {
        if (categoryId === null) {
          grouped.set(null, { category: null, providers: [] })
        } else {
          const category = categories.find(cat => cat.id === categoryId)
          if (category) {
            grouped.set(categoryId, { category, providers: [] })
          }
        }
      })
    }

    // Group filtered providers
    filteredProviders.forEach(provider => {
      const categoryId = provider.categoryId || null
      const group = grouped.get(categoryId)
      if (group) {
        group.providers.push(provider)
      } else if (!searchQuery) {
        // If provider has a category that doesn't exist, put in uncategorized (only when not searching)
        const uncategorized = grouped.get(null)!
        uncategorized.providers.push(provider)
      }
    })

    // Return categories with providers, filter out empty uncategorized
    return Array.from(grouped.entries())
      .filter(([categoryId, group]) =>
        group.providers.length > 0 || (categoryId !== null && !searchQuery)
      )
      .map(([categoryId, group]) => group)
  }, [providers, categories, searchQuery])

  // Create provider mutation
  const createMutation = trpc.serviceProviders.create.useMutation({
    onSuccess: () => {
      utils.serviceProviders.list.invalidate()
      setIsDrawerOpen(false)
      setSelectedProvider(null)
      setPrefilledCategoryId(undefined)
    },
  })

  // Update provider mutation
  const updateMutation = trpc.serviceProviders.update.useMutation({
    onSuccess: () => {
      utils.serviceProviders.list.invalidate()
      setIsDrawerOpen(false)
      setSelectedProvider(null)
      setPrefilledCategoryId(undefined)
    },
  })

  // Delete provider mutation
  const deleteMutation = trpc.serviceProviders.delete.useMutation({
    onSuccess: () => {
      utils.serviceProviders.list.invalidate()
    },
  })

  // Add service mutation
  const addServiceMutation = trpc.serviceProviders.addService.useMutation({
    onSuccess: () => {
      utils.serviceProviders.list.invalidate()
      setIsServiceDrawerOpen(false)
      setProviderForService(null)
      setEditingService(null)
    },
  })

  // Update service mutation
  const updateServiceMutation = trpc.serviceProviders.updateService.useMutation({
    onSuccess: () => {
      utils.serviceProviders.list.invalidate()
      setIsServiceDrawerOpen(false)
      setProviderForService(null)
      setEditingService(null)
    },
  })

  // Delete service mutation
  const deleteServiceMutation = trpc.serviceProviders.deleteService.useMutation({
    onSuccess: () => {
      utils.serviceProviders.list.invalidate()
    },
  })

  const handleSubmit = (data: ServiceProviderFormData) => {
    if (selectedProvider) {
      updateMutation.mutate({
        serviceProviderId: selectedProvider.id,
        ...data,
      })
    } else {
      createMutation.mutate({
        organizationId: currentOrg?.id || '',
        ...data,
      })
    }
  }

  const handleEdit = (provider: ServiceProvider) => {
    setSelectedProvider(provider)
    setIsDrawerOpen(true)
  }

  const handleDelete = (providerId: string) => {
    if (confirm(t('serviceProviders.confirmDelete'))) {
      deleteMutation.mutate({ serviceProviderId: providerId })
    }
  }

  const handleCreateNew = (categoryId?: string) => {
    setSelectedProvider(null)
    setPrefilledCategoryId(categoryId)
    setIsDrawerOpen(true)
  }

  const handleAddService = (provider: ServiceProvider) => {
    setProviderForService(provider)
    setEditingService(null)
    setIsServiceDrawerOpen(true)
  }

  const handleManageServices = (provider: ServiceProvider) => {
    setManagingProvider(provider)
    setIsServicesManagerOpen(true)
  }

  const handleEditService = (service: ServiceProviderService) => {
    setEditingService(service)
    setProviderForService(managingProvider)
    setIsServicesManagerOpen(false)
    setIsServiceDrawerOpen(true)
  }

  const handleDeleteService = (serviceId: string) => {
    deleteServiceMutation.mutate({ serviceId })
  }

  const handleServiceSubmit = (data: ServiceFormData) => {
    if (!providerForService) return

    if (editingService) {
      updateServiceMutation.mutate({
        serviceId: editingService.id,
        ...data,
      })
    } else {
      addServiceMutation.mutate({
        serviceProviderId: providerForService.id,
        ...data,
      })
    }
  }

  if (!currentSite) {
    return null
  }

  return (
    <div className="container mx-auto">
      <div className="flex justify-between items-center mb-6 pt-4 px-4">
        <h1 className="text-2xl font-bold">{t('serviceProviders.title')}</h1>
        <Button onClick={() => handleCreateNew()}>
          <Plus className="w-4 h-4 me-2" />
          {t('serviceProviders.addProvider')}
        </Button>
      </div>

      {/* Search */}
      <div className="mb-6 px-4">
        <div className="relative">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('serviceProviders.searchPlaceholder')}
            className="ps-10"
          />
        </div>
      </div>

      {/* Providers Accordion */}
      {isLoading ? (
        <div className="text-center py-8">{t('common.loading')}</div>
      ) : providers.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          {t('serviceProviders.noProviders')}
        </div>
      ) : (
        <Accordion type="multiple" className="w-full">
          {groupedProviders.map((group, index) => (
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
                    {t('serviceProviders.providerCount', { count: group.providers.length })}
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className=" flex justify-center mt-2">
                  <CreateServiceProviderButton
                    category={group.category}
                    onClick={handleCreateNew}
                    showText={true}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
                  {group.providers.map((provider) => (
                    <ServiceProviderCard
                      key={provider.id}
                      provider={provider}
                    />
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}

      {/* Create/Edit Drawer */}
      <Drawer
        open={isDrawerOpen}
        onOpenChange={(open) => {
          setIsDrawerOpen(open)
          if (!open) {
            setPrefilledCategoryId(undefined)
            setSelectedProvider(null)
          }
        }}
      >
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>
              {selectedProvider
                ? t('serviceProviders.editProvider')
                : t('serviceProviders.createProvider')}
            </DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-4">
            <ServiceProviderForm
              provider={selectedProvider}
              prefilledCategoryId={prefilledCategoryId}
              onSubmit={handleSubmit}
              onCancel={() => setIsDrawerOpen(false)}
              isSubmitting={createMutation.isPending || updateMutation.isPending}
            />
          </div>
        </DrawerContent>
      </Drawer>

      {/* Service Management Drawer */}
      <Drawer open={isServiceDrawerOpen} onOpenChange={setIsServiceDrawerOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>
              {editingService
                ? t('serviceProviders.editService')
                : t('serviceProviders.addServiceFor', { provider: providerForService?.name })}
            </DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-4">
            {providerForService && (
              <ServiceProviderServiceForm
                provider={providerForService}
                service={editingService || undefined}
                onSubmit={handleServiceSubmit}
                onCancel={() => setIsServiceDrawerOpen(false)}
                isSubmitting={addServiceMutation.isPending || updateServiceMutation.isPending}
              />
            )}
          </div>
        </DrawerContent>
      </Drawer>

      {/* Services Manager Drawer */}
      <Drawer open={isServicesManagerOpen} onOpenChange={setIsServicesManagerOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>
              {managingProvider?.name} - {t('serviceProviders.manageServices')}
            </DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-4 max-h-[60vh] overflow-y-auto">
            {managingProvider && (
              <ServiceProviderServicesManager
                provider={managingProvider}
                onAddService={() => {
                  setProviderForService(managingProvider)
                  setEditingService(null)
                  setIsServicesManagerOpen(false)
                  setIsServiceDrawerOpen(true)
                }}
                onEditService={handleEditService}
                onDeleteService={handleDeleteService}
              />
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  )
}