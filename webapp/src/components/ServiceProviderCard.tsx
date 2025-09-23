import { useTranslation } from 'react-i18next'
import { Phone, Mail, Edit, Trash2, FileText, Plus, Settings } from 'lucide-react'
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

interface ServiceProviderCardProps {
  provider: ServiceProvider
  onEdit: (provider: ServiceProvider) => void
  onDelete: (providerId: string) => void
  onAddService: (provider: ServiceProvider) => void
  onManageServices: (provider: ServiceProvider) => void
}

export function ServiceProviderCard({ provider, onEdit, onDelete, onAddService, onManageServices }: ServiceProviderCardProps) {
  const { t } = useTranslation()

  return (
    <Card>
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
              onClick={() => onManageServices(provider)}
              title={t('serviceProviders.manageServices')}
            >
              <Settings className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onAddService(provider)}
              title={t('serviceProviders.addService')}
            >
              <Plus className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onEdit(provider)}
              title={t('common.edit')}
            >
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onDelete(provider.id)}
              title={t('common.delete')}
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
  )
}