import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Edit2, Trash2, FileText, DollarSign, Coins } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from '../../../server/src/routers/appRouter'

type RouterOutput = inferRouterOutputs<AppRouter>
type ServiceProvider = RouterOutput['serviceProviders']['list'][0]
type ServiceProviderService = ServiceProvider['services'][0]

interface ServiceProviderServicesManagerProps {
  provider: ServiceProvider
  onAddService: () => void
  onEditService: (service: ServiceProviderService) => void
  onDeleteService: (serviceId: string) => void
}

export function ServiceProviderServicesManager({
  provider,
  onAddService,
  onEditService,
  onDeleteService,
}: ServiceProviderServicesManagerProps) {
  const { t } = useTranslation()

  const formatPrice = (price: number | null, currency: string | null) => {
    if (!price) return t('serviceProviders.noPriceSet')

    const currencySymbols: Record<string, string> = {
      USD: '$',
      EUR: '€',
      GBP: '£',
      ILS: '₪',
      AED: 'د.إ',
    }

    const symbol = currency ? currencySymbols[currency] || currency : ''
    return `${symbol}${price.toFixed(2)}`
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">{t('serviceProviders.servicesOffered')}</h3>
          <p className="text-sm text-gray-500">
            {provider.services.length} {t('serviceProviders.servicesCount')}
          </p>
        </div>
        <Button onClick={onAddService} size="sm">
          <Plus className="w-4 h-4 me-2" />
          {t('serviceProviders.addService')}
        </Button>
      </div>

      {provider.services.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <p className="text-gray-500 mb-4">{t('serviceProviders.noServicesYet')}</p>
            <Button onClick={onAddService} variant="outline">
              <Plus className="w-4 h-4 me-2" />
              {t('serviceProviders.addFirstService')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {provider.services.map((service) => (
            <Card key={service.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-base">
                      {service.category.name}
                    </CardTitle>
                    {service.category.description && (
                      <CardDescription className="text-sm">
                        {service.category.description}
                      </CardDescription>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEditService(service)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm(t('serviceProviders.confirmDeleteService'))) {
                          onDeleteService(service.id)
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Pricing Summary Row */}
                <div className="grid grid-cols-3 gap-4 text-sm">
                  {/* Client Price */}
                  <div className="text-center">
                    <div className="text-xs text-gray-500 mb-1">{t('serviceProviders.price')}</div>
                    <div className="font-semibold text-green-600">
                      {service.price ? formatPrice(service.price, service.currency) : '-'}
                    </div>
                  </div>

                  {/* Provider Cost */}
                  <div className="text-center">
                    <div className="text-xs text-gray-500 mb-1">{t('serviceProviders.providerPrice')}</div>
                    <div className="font-semibold text-red-600">
                      {service.providerPrice !== null && service.providerPrice !== undefined
                        ? formatPrice(service.providerPrice, service.currency)
                        : '-'}
                    </div>
                  </div>

                  {/* Net Profit with Margin */}
                  <div className="text-center">
                    <div className="text-xs text-gray-500 mb-1">{t('events.profit')}</div>
                    <div className={`font-semibold ${
                      service.price !== null && service.price !== undefined &&
                      service.providerPrice !== null && service.providerPrice !== undefined
                        ? (service.price - service.providerPrice) >= 0 ? 'text-green-600' : 'text-red-600'
                        : 'text-gray-400'
                    }`}>
                      {service.price !== null && service.price !== undefined &&
                       service.providerPrice !== null && service.providerPrice !== undefined
                        ? (
                          <>
                            {formatPrice(service.price - service.providerPrice, service.currency)}
                            {service.price > 0 && (
                              <span className="text-xs ms-1">
                                ({Math.round(((service.price - service.providerPrice) / service.price) * 100)}%)
                              </span>
                            )}
                          </>
                        )
                        : '-'}
                    </div>
                  </div>
                </div>

                {/* Divider if documents exist */}
                {service.fileLinks && service.fileLinks.length > 0 && (
                  <hr className="border-gray-200" />
                )}

                {service.fileLinks && service.fileLinks.length > 0 && (
                  <div className="pt-2">
                    <div className="flex items-center gap-1 text-sm text-gray-600 mb-2">
                      <FileText className="w-4 h-4" />
                      <span>{t('serviceProviders.attachedDocuments')}</span>
                    </div>
                    <div className="space-y-1">
                      {service.fileLinks.map((link, index) => (
                        <a
                          key={index}
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-sm text-blue-600 hover:underline truncate"
                        >
                          {link.split('/').pop() || t('serviceProviders.document')} #{index + 1}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}