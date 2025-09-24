import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { X, Upload, File } from 'lucide-react'
import { trpc } from '@/utils/trpc'
import { useCurrentOrg } from '@/contexts/CurrentOrgContext'
import type { inferRouterOutputs, inferRouterInputs } from '@trpc/server'
import type { AppRouter } from '../../../server/src/routers/appRouter'

type RouterOutput = inferRouterOutputs<AppRouter>
type RouterInput = inferRouterInputs<AppRouter>
type ServiceProvider = RouterOutput['serviceProviders']['list'][0]
type ServiceCategory = RouterOutput['serviceProviders']['listCategories'][0]
type ServiceProviderService = ServiceProvider['services'][0]

// Use the input type from the addService mutation, excluding serviceProviderId
type ServiceFormData = Omit<RouterInput['serviceProviders']['addService'], 'serviceProviderId'>

interface ServiceProviderServiceFormProps {
  provider: ServiceProvider
  service?: ServiceProviderService
  onSubmit: (data: ServiceFormData) => void
  onCancel: () => void
  isSubmitting: boolean
}

export function ServiceProviderServiceForm({
  provider,
  service,
  onSubmit,
  onCancel,
  isSubmitting,
}: ServiceProviderServiceFormProps) {
  const { t } = useTranslation()
  const { currentOrg } = useCurrentOrg()
  const [formData, setFormData] = useState<ServiceFormData>({
    categoryId: service?.categoryId || '',
    price: service?.price || undefined,
    providerPrice: service?.providerPrice || undefined,
    currency: service?.currency || 'ILS',
    fileLinks: service?.fileLinks || [],
  })
  const [newFileLink, setNewFileLink] = useState('')

  // Fetch categories
  const { data: categories = [] } = trpc.serviceProviders.listCategories.useQuery(
    { organizationId: currentOrg?.id || '' },
    { enabled: !!currentOrg?.id }
  )

  // Filter out categories that the provider already has (except if editing that service)
  const availableCategories = categories.filter(category => {
    if (service && category.id === service.categoryId) {
      return true // Allow current category when editing
    }
    return !provider.services.some(s => s.categoryId === category.id)
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.categoryId) {
      return
    }
    onSubmit(formData)
  }

  const handleAddFileLink = () => {
    if (newFileLink && newFileLink.startsWith('http')) {
      setFormData({
        ...formData,
        fileLinks: [...(formData.fileLinks || []), newFileLink],
      })
      setNewFileLink('')
    }
  }

  const handleRemoveFileLink = (index: number) => {
    setFormData({
      ...formData,
      fileLinks: formData.fileLinks?.filter((_, i) => i !== index),
    })
  }

  const currencies = [
    { code: 'ILS', symbol: '₪', name: 'Israeli Shekel' },
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'GBP', symbol: '£', name: 'British Pound' },
    { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
  ]

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium mb-2 block">
          {t('serviceProviders.serviceCategory')}
        </label>
        <Select
          value={formData.categoryId}
          onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
          disabled={!!service} // Disable category change when editing
        >
          <SelectTrigger>
            <SelectValue placeholder={t('serviceProviders.selectCategory')} />
          </SelectTrigger>
          <SelectContent>
            {availableCategories.length === 0 ? (
              <div className="px-2 py-1 text-sm text-gray-500">
                {t('serviceProviders.noAvailableCategories')}
              </div>
            ) : (
              availableCategories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                  {category.description && (
                    <span className="text-xs text-gray-500 ms-2">
                      {category.description}
                    </span>
                  )}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        {service && (
          <p className="text-xs text-gray-500 mt-1">
            {t('serviceProviders.categoryCannotBeChanged')}
          </p>
        )}
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">
              {t('serviceProviders.price')} ({t('common.optional')})
            </label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={formData.price || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  price: e.target.value ? parseFloat(e.target.value) : undefined,
                })
              }
              placeholder={t('serviceProviders.pricePlaceholder')}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">
              {t('serviceProviders.providerPrice')} ({t('common.optional')})
            </label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={formData.providerPrice || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  providerPrice: e.target.value ? parseFloat(e.target.value) : undefined,
                })
              }
              placeholder={t('serviceProviders.providerPricePlaceholder')}
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">
            {t('serviceProviders.currency')}
          </label>
          <Select
            value={formData.currency || 'ILS'}
            onValueChange={(value) => setFormData({ ...formData, currency: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {currencies.map((currency) => (
                <SelectItem key={currency.code} value={currency.code}>
                  {currency.symbol} {currency.code} - {currency.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block">
          {t('serviceProviders.documentLinks')} ({t('common.optional')})
        </label>
        <div className="space-y-2">
          {formData.fileLinks && formData.fileLinks.length > 0 && (
            <div className="space-y-1">
              {formData.fileLinks.map((link, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 p-2 bg-gray-50 rounded-md"
                >
                  <File className="w-4 h-4 text-gray-400" />
                  <a
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline truncate flex-1"
                  >
                    {link}
                  </a>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRemoveFileLink(index)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <Input
              type="url"
              value={newFileLink}
              onChange={(e) => setNewFileLink(e.target.value)}
              placeholder={t('serviceProviders.documentLinkPlaceholder')}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleAddFileLink()
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleAddFileLink}
              disabled={!newFileLink || !newFileLink.startsWith('http')}
            >
              <Upload className="w-4 h-4 me-2" />
              {t('common.add')}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          type="submit"
          disabled={isSubmitting || !formData.categoryId || availableCategories.length === 0}
        >
          {service ? t('common.update') : t('common.create')}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          {t('common.cancel')}
        </Button>
      </div>
    </form>
  )
}