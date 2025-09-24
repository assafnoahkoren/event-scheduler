import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Edit2, Trash2, Save, X, Phone, Mail, FileText, Coins } from 'lucide-react'
import type { inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from '@/../../server/src/routers/appRouter'

type RouterOutput = inferRouterOutputs<AppRouter>
type EventProvider = NonNullable<RouterOutput['eventProviders']['list']>[0]

interface EventServiceCardProps {
  eventProvider: EventProvider
  onRemove: () => void
  onUpdate: (price: number, notes?: string, providerPrice?: number) => void
}

export function EventServiceCard({ eventProvider, onRemove, onUpdate }: EventServiceCardProps) {
  const { t } = useTranslation()
  const [isEditing, setIsEditing] = useState(false)
  const [price, setPrice] = useState(eventProvider.agreedPrice || eventProvider.providerService?.price || 0)
  const [providerPrice, setProviderPrice] = useState(eventProvider.providerPrice || 0)
  const [notes, setNotes] = useState(eventProvider.notes || '')

  const handleSave = () => {
    onUpdate(price, notes || undefined, providerPrice)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setPrice(eventProvider.agreedPrice || eventProvider.providerService?.price || 0)
    setProviderPrice(eventProvider.providerPrice || 0)
    setNotes(eventProvider.notes || '')
    setIsEditing(false)
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
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">
              {eventProvider.provider.name}
            </CardTitle>
            <CardDescription>
              {eventProvider.providerService?.category?.name || eventProvider.providerService?.name}
            </CardDescription>
          </div>
          <div className="flex gap-1">
            {!isEditing && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onRemove}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isEditing ? (
          <>
            <div>
              <label className="text-sm font-medium mb-1 block">
                {t('serviceProviders.price')}
              </label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                  step="0.01"
                  min="0"
                />
                <span className="text-sm text-muted-foreground">
                  {eventProvider.providerService?.currency || 'ILS'}
                </span>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">
                {t('events.providerPrice')}
              </label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={providerPrice}
                  onChange={(e) => setProviderPrice(parseFloat(e.target.value) || 0)}
                  step="0.01"
                  min="0"
                />
                <span className="text-sm text-muted-foreground">
                  {eventProvider.providerService?.currency || 'ILS'}
                </span>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">
                {t('clients.notes')}
              </label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder={t('clients.notesPlaceholder')}
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave}>
                <Save className="w-4 h-4 me-2" />
                {t('common.save')}
              </Button>
              <Button size="sm" variant="outline" onClick={handleCancel}>
                <X className="w-4 h-4 me-2" />
                {t('common.cancel')}
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <Coins className="w-4 h-4 text-gray-400" />
                <span className="font-medium">
                  {formatPrice(price, eventProvider.providerService?.currency)}
                </span>
              </div>
              {eventProvider.providerPrice > 0 && (
                <div className="flex items-center gap-1">
                  <span className="text-sm text-muted-foreground">
                    {t('events.providerPrice')}:
                  </span>
                  <span className="text-sm">
                    {formatPrice(eventProvider.providerPrice, eventProvider.providerService?.currency)}
                  </span>
                </div>
              )}
            </div>

            {eventProvider.provider.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="w-4 h-4 text-gray-400" />
                <span>{eventProvider.provider.phone}</span>
              </div>
            )}

            {eventProvider.provider.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4 text-gray-400" />
                <span>{eventProvider.provider.email}</span>
              </div>
            )}

            {notes && (
              <div className="flex items-start gap-2 text-sm">
                <FileText className="w-4 h-4 text-gray-400 mt-0.5" />
                <span className="text-muted-foreground">{notes}</span>
              </div>
            )}

            {eventProvider.providerService?.fileLinks && eventProvider.providerService.fileLinks.length > 0 && (
              <div className="pt-2">
                <p className="text-sm font-medium mb-2">{t('serviceProviders.attachedDocuments')}</p>
                <div className="flex flex-wrap gap-2">
                  {eventProvider.providerService.fileLinks.map((link, index) => (
                    <a
                      key={index}
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-sm hover:bg-gray-200"
                    >
                      <FileText className="w-3 h-3" />
                      {t('serviceProviders.document')} {index + 1}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}