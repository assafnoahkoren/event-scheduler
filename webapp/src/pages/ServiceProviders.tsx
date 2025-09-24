import { useState } from 'react'
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
import { ServiceProviderCard } from '@/components/ServiceProviderCard'
import { ServiceProviderServiceForm } from '@/components/ServiceProviderServiceForm'
import { ServiceProviderServicesManager } from '@/components/ServiceProviderServicesManager'
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
  onSubmit,
  onCancel,
  isSubmitting,
}: {
  provider?: ServiceProvider | null
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
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const submitData = {
      ...formData,
      email: formData.email || undefined,
      phone: formData.phone || undefined,
      notes: formData.notes || undefined,
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

  // Create provider mutation
  const createMutation = trpc.serviceProviders.create.useMutation({
    onSuccess: () => {
      utils.serviceProviders.list.invalidate()
      setIsDrawerOpen(false)
      setSelectedProvider(null)
    },
  })

  // Update provider mutation
  const updateMutation = trpc.serviceProviders.update.useMutation({
    onSuccess: () => {
      utils.serviceProviders.list.invalidate()
      setIsDrawerOpen(false)
      setSelectedProvider(null)
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

  const handleCreateNew = () => {
    setSelectedProvider(null)
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
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{t('serviceProviders.title')}</h1>
        <Button onClick={handleCreateNew}>
          <Plus className="w-4 h-4 me-2" />
          {t('serviceProviders.addProvider')}
        </Button>
      </div>

      {/* Search */}
      <div className="mb-6">
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

      {/* Providers Grid */}
      {isLoading ? (
        <div className="text-center py-8">{t('common.loading')}</div>
      ) : providers.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          {t('serviceProviders.noProviders')}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {providers.map((provider) => (
            <ServiceProviderCard
              key={provider.id}
              provider={provider}
            />
          ))}
        </div>
      )}

      {/* Create/Edit Drawer */}
      <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
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