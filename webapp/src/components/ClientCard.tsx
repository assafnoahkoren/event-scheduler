import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Mail, Phone, Trash2, MessageCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import type { inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from '../../../server/src/routers/appRouter'

type RouterOutput = inferRouterOutputs<AppRouter>
type ClientSearchResult = RouterOutput['clients']['search'][0]

interface ClientCardProps {
  client: ClientSearchResult
  onEdit: (client: ClientSearchResult) => void
  onDelete: (client: ClientSearchResult) => void
  className?: string
}

export function ClientCard({ client, onEdit, onDelete, className }: ClientCardProps) {
  const { t } = useTranslation()
  const hasPhone = !!client.phone

  return (
    <Card className={cn("overflow-hidden hover:shadow-md transition-shadow", className)}>
      <div className="flex">
        {/* Main content area */}
        <div
          onClick={() => onEdit(client)}
          className="flex-1 min-w-0 p-3 cursor-pointer hover:bg-accent/50 transition-colors"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-sm line-clamp-1">{client.name}</h3>
              <div className="flex items-center gap-3 mt-1">
                {client.email && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Mail className="h-3 w-3 shrink-0" />
                    <span className="truncate">{client.email}</span>
                  </div>
                )}
                {client.phone && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Phone className="h-3 w-3 shrink-0" />
                    <span className="truncate">{client.phone}</span>
                  </div>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation()
                onDelete(client)
              }}
              className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Action buttons - full height */}
        {hasPhone && (
          <div className="flex">
            <button
              onClick={() => window.location.href = `tel:${client.phone}`}
              className="px-3 bg-blue-50 hover:bg-blue-100 border-s flex items-center justify-center transition-colors"
              title={t('clients.phoneCall')}
            >
              <Phone className="h-4 w-4 text-blue-600" />
            </button>
            <button
              onClick={() => {
                const phoneNumber = client.phone!.replace(/\D/g, '')
                window.open(`https://wa.me/${phoneNumber}`, '_blank')
              }}
              className="px-3 bg-green-50 hover:bg-green-100 border-s flex items-center justify-center transition-colors"
              title={t('clients.whatsappMessage')}
            >
              <MessageCircle className="h-4 w-4 text-green-600" />
            </button>
          </div>
        )}
      </div>
    </Card>
  )
}