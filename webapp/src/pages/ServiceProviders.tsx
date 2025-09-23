import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { trpc } from '@/utils/trpc'
import { useCurrentSite } from '@/contexts/CurrentSiteContext'
import { Plus, Search, Phone, Mail, Edit, Trash2, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  DrawerFooter,
} from '@/components/ui/drawer'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from '../../../server/src/routers/appRouter'

type RouterOutput = inferRouterOutputs<AppRouter>
type ServiceProvider = RouterOutput['serviceProviders']['list'][0]
type ServiceCategory = RouterOutput['serviceProviders']['listCategories'][0]

interface ServiceProviderFormData {
  name: string
  phone?: string
  email?: string
  notes?: string
}

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
  const [searchQuery, setSearchQuery] = useState('')
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState<ServiceProvider | null>(null)

  const utils = trpc.useUtils()

  // Fetch providers
  const { data: providers = [], isLoading } = trpc.serviceProviders.list.useQuery(
    { search: searchQuery },
    { enabled: !!currentSite?.id }
  )

  // Fetch categories
  const { data: categories = [] } = trpc.serviceProviders.listCategories.useQuery(
    undefined,
    { enabled: !!currentSite?.id }
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

  const handleSubmit = (data: ServiceProviderFormData) => {
    if (selectedProvider) {
      updateMutation.mutate({
        serviceProviderId: selectedProvider.id,
        ...data,
      })
    } else {
      createMutation.mutate(data)
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
            <Card key={provider.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{provider.name}</CardTitle>
                    <CardDescription>
                      {provider._count.eventProviders} {t('serviceProviders.events')}
                    </CardDescription>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEdit(provider)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(provider.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {provider.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span>{provider.phone}</span>
                  </div>
                )}
                {provider.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span>{provider.email}</span>
                  </div>
                )}
                {provider.services.length > 0 && (
                  <div className="pt-2">
                    <div className="flex flex-wrap gap-1">
                      {provider.services.map((service) => (
                        <Badge key={service.id} variant="secondary">
                          {service.category.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {provider.notes && (
                  <div className="flex items-start gap-2 text-sm text-gray-600 pt-2">
                    <FileText className="w-4 h-4 text-gray-400 mt-0.5" />
                    <span className="line-clamp-2">{provider.notes}</span>
                  </div>
                )}
              </CardContent>
            </Card>
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
    </div>
  )
}