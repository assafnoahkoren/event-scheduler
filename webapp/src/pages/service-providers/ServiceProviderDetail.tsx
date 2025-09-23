import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { trpc } from '@/utils/trpc'
import { ArrowLeft, Phone, Mail, FileText, Edit, Trash2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { ServiceProviderServiceForm } from '@/components/ServiceProviderServiceForm'
import { ServiceProviderServicesManager } from '@/components/ServiceProviderServicesManager'
import type { inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from '../../../../server/src/routers/appRouter'

type RouterOutput = inferRouterOutputs<AppRouter>
type ServiceProvider = RouterOutput['serviceProviders']['get']
type ServiceProviderService = NonNullable<ServiceProvider>['services'][0]

interface ServiceFormData {
  categoryId: string
  price?: number
  currency?: string
  fileLinks?: string[]
}

interface ProviderFormData {
  name: string
  phone?: string
  email?: string
  notes?: string
}

function ProviderDetailsTab({ provider }: { provider: NonNullable<ServiceProvider> }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false)

  const utils = trpc.useUtils()

  const updateMutation = trpc.serviceProviders.update.useMutation({
    onSuccess: () => {
      utils.serviceProviders.get.invalidate()
      setIsEditDrawerOpen(false)
    },
  })

  const deleteMutation = trpc.serviceProviders.delete.useMutation({
    onSuccess: () => {
      navigate('/service-providers')
    },
  })

  const handleUpdate = (data: ProviderFormData) => {
    updateMutation.mutate({
      serviceProviderId: provider.id,
      ...data,
    })
  }

  const handleDelete = () => {
    if (confirm(t('serviceProviders.confirmDelete'))) {
      deleteMutation.mutate({ serviceProviderId: provider.id })
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>{t('serviceProviders.providerDetails')}</CardTitle>
              <CardDescription>
                {t('serviceProviders.providerDetailsDescription')}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsEditDrawerOpen(true)}>
                <Edit className="w-4 h-4 me-2" />
                {t('common.edit')}
              </Button>
              <Button variant="outline" onClick={handleDelete}>
                <Trash2 className="w-4 h-4 me-2" />
                {t('common.delete')}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">
                {t('serviceProviders.name')}
              </label>
              <p className="text-sm">{provider.name}</p>
            </div>

            {provider.phone && (
              <div>
                <label className="text-sm font-medium text-gray-500">
                  {t('serviceProviders.phone')}
                </label>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <p className="text-sm">{provider.phone}</p>
                </div>
              </div>
            )}

            {provider.email && (
              <div>
                <label className="text-sm font-medium text-gray-500">
                  {t('serviceProviders.email')}
                </label>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <p className="text-sm">{provider.email}</p>
                </div>
              </div>
            )}
          </div>

          {provider.notes && (
            <div>
              <label className="text-sm font-medium text-gray-500">
                {t('serviceProviders.notes')}
              </label>
              <div className="flex items-start gap-2 mt-1">
                <FileText className="w-4 h-4 text-gray-400 mt-0.5" />
                <p className="text-sm">{provider.notes}</p>
              </div>
            </div>
          )}

          <div className="pt-4 border-t">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">
                  {t('serviceProviders.totalEvents')}
                </p>
                <p className="text-2xl font-bold">{provider._count.eventProviders}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">
                  {t('serviceProviders.totalServices')}
                </p>
                <p className="text-2xl font-bold">{provider.services.length}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Provider Drawer */}
      <Drawer open={isEditDrawerOpen} onOpenChange={setIsEditDrawerOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{t('serviceProviders.editProvider')}</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-4">
            <ProviderEditForm
              provider={provider}
              onSubmit={handleUpdate}
              onCancel={() => setIsEditDrawerOpen(false)}
              isSubmitting={updateMutation.isPending}
            />
          </div>
        </DrawerContent>
      </Drawer>
    </>
  )
}

function ProviderEditForm({
  provider,
  onSubmit,
  onCancel,
  isSubmitting,
}: {
  provider: NonNullable<ServiceProvider>
  onSubmit: (data: ProviderFormData) => void
  onCancel: () => void
  isSubmitting: boolean
}) {
  const { t } = useTranslation()
  const [formData, setFormData] = useState<ProviderFormData>({
    name: provider.name,
    phone: provider.phone || '',
    email: provider.email || '',
    notes: provider.notes || '',
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
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full px-3 py-2 border rounded-md"
          required
        />
      </div>

      <div>
        <label className="text-sm font-medium">
          {t('serviceProviders.phone')} ({t('common.optional')})
        </label>
        <input
          type="tel"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          className="w-full px-3 py-2 border rounded-md"
        />
      </div>

      <div>
        <label className="text-sm font-medium">
          {t('serviceProviders.email')} ({t('common.optional')})
        </label>
        <input
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="w-full px-3 py-2 border rounded-md"
        />
      </div>

      <div>
        <label className="text-sm font-medium">{t('serviceProviders.notes')}</label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          className="w-full px-3 py-2 border rounded-md"
          rows={3}
        />
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {t('common.update')}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          {t('common.cancel')}
        </Button>
      </div>
    </form>
  )
}

export function ServiceProviderDetail() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { providerId } = useParams<{ providerId: string }>()
  const [activeTab, setActiveTab] = useState('details')
  const [isServiceDrawerOpen, setIsServiceDrawerOpen] = useState(false)
  const [editingService, setEditingService] = useState<ServiceProviderService | null>(null)

  const utils = trpc.useUtils()

  // Fetch provider details
  const { data: provider, isLoading } = trpc.serviceProviders.get.useQuery(
    { serviceProviderId: providerId! },
    { enabled: !!providerId }
  )

  // Service mutations
  const addServiceMutation = trpc.serviceProviders.addService.useMutation({
    onSuccess: () => {
      utils.serviceProviders.get.invalidate()
      setIsServiceDrawerOpen(false)
      setEditingService(null)
    },
  })

  const updateServiceMutation = trpc.serviceProviders.updateService.useMutation({
    onSuccess: () => {
      utils.serviceProviders.get.invalidate()
      setIsServiceDrawerOpen(false)
      setEditingService(null)
    },
  })

  const deleteServiceMutation = trpc.serviceProviders.deleteService.useMutation({
    onSuccess: () => {
      utils.serviceProviders.get.invalidate()
    },
  })

  const handleAddService = () => {
    setEditingService(null)
    setIsServiceDrawerOpen(true)
  }

  const handleEditService = (service: ServiceProviderService) => {
    setEditingService(service)
    setIsServiceDrawerOpen(true)
  }

  const handleDeleteService = (serviceId: string) => {
    if (confirm(t('serviceProviders.confirmDeleteService'))) {
      deleteServiceMutation.mutate({ serviceId })
    }
  }

  const handleServiceSubmit = (data: ServiceFormData) => {
    if (!provider) return

    if (editingService) {
      updateServiceMutation.mutate({
        serviceId: editingService.id,
        ...data,
      })
    } else {
      addServiceMutation.mutate({
        serviceProviderId: provider.id,
        ...data,
      })
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="text-center">
          <p>{t('common.loading')}</p>
        </div>
      </div>
    )
  }

  if (!provider) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="text-center">
          <p>{t('serviceProviders.providerNotFound')}</p>
          <Button onClick={() => navigate('/service-providers')} className="mt-4">
            <ArrowLeft className="w-4 h-4 me-2" />
            {t('serviceProviders.backToProviders')}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/service-providers')}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 me-2" />
          {t('serviceProviders.backToProviders')}
        </Button>

        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold">{provider.name}</h1>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4 w-full">
          <TabsTrigger value="details">{t('serviceProviders.detailsTab')}</TabsTrigger>
          <TabsTrigger value="services">
            {t('serviceProviders.servicesTab')} ({provider.services.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <ProviderDetailsTab provider={provider} />
        </TabsContent>

        <TabsContent value="services">
          <ServiceProviderServicesManager
            provider={provider}
            onAddService={handleAddService}
            onEditService={handleEditService}
            onDeleteService={handleDeleteService}
          />
        </TabsContent>
      </Tabs>

      {/* Service Management Drawer */}
      <Drawer open={isServiceDrawerOpen} onOpenChange={setIsServiceDrawerOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>
              {editingService
                ? t('serviceProviders.editService')
                : t('serviceProviders.addServiceFor', { provider: provider.name })}
            </DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-4">
            <ServiceProviderServiceForm
              provider={provider}
              service={editingService || undefined}
              onSubmit={handleServiceSubmit}
              onCancel={() => setIsServiceDrawerOpen(false)}
              isSubmitting={addServiceMutation.isPending || updateServiceMutation.isPending}
            />
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  )
}