import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Phone, Mail, MessageCircle } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from '../../../server/src/routers/appRouter'

type RouterOutput = inferRouterOutputs<AppRouter>
type ServiceProvider = RouterOutput['serviceProviders']['list'][0]

interface ServiceProviderCardProps {
  provider: ServiceProvider
}

export function ServiceProviderCard({ provider }: ServiceProviderCardProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const hasPhone = !!provider.phone

  const handleCardClick = () => {
    navigate(`/service-providers/${provider.id}`)
  }

  return (
    <Card className="overflow-hidden shadow-none transition-shadow hover:shadow-md">
      <div className="flex">
        {/* Main content area */}
        <div
          onClick={handleCardClick}
          className="flex-1 min-w-0 p-3 cursor-pointer hover:bg-accent/50 transition-colors"
        >
          <h3 className="font-medium text-sm line-clamp-1 mb-1">{provider.name}</h3>

          {/* Contact info */}
          <div className="flex items-center gap-3 mb-2">
            {provider.email && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Mail className="h-3 w-3 shrink-0" />
                <span className="truncate">{provider.email}</span>
              </div>
            )}
            {provider.phone && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Phone className="h-3 w-3 shrink-0" />
                <span className="truncate">{provider.phone}</span>
              </div>
            )}
          </div>

          {/* Services badges */}
          {provider.services.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {provider.services.slice(0, 3).map((service) => (
                <Badge key={service.id} variant="secondary" className="text-xs py-0 px-1.5">
                  {service.category?.name || service.name}
                </Badge>
              ))}
              {provider.services.length > 3 && (
                <Badge variant="outline" className="text-xs py-0 px-1.5">
                  +{provider.services.length - 3}
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Action buttons - full height */}
        {hasPhone && (
          <div className="flex">
            <button
              onClick={(e) => {
                e.stopPropagation()
                window.location.href = `tel:${provider.phone}`
              }}
              className="px-3 bg-blue-50 hover:bg-blue-100 border-s flex items-center justify-center transition-colors"
              title={t('serviceProviders.phoneCall')}
            >
              <Phone className="h-4 w-4 text-blue-600" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                const phoneNumber = provider.phone!.replace(/\D/g, '')
                window.open(`https://wa.me/${phoneNumber}`, '_blank')
              }}
              className="px-3 bg-green-50 hover:bg-green-100 border-s flex items-center justify-center transition-colors"
              title={t('serviceProviders.whatsappMessage')}
            >
              <MessageCircle className="h-4 w-4 text-green-600" />
            </button>
          </div>
        )}
      </div>
    </Card>
  )
}