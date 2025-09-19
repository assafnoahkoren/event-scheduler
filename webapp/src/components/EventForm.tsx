import { useState } from 'react'
import { format } from 'date-fns'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ClientCombobox } from '@/components/ClientCombobox'
import { ClientForm, type ClientFormData } from '@/components/ClientForm'
import { trpc } from '@/utils/trpc'
import type { inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from '@/../../server/src/routers/appRouter'

type RouterOutput = inferRouterOutputs<AppRouter>
type Event = RouterOutput['events']['get']

interface EventFormProps {
  event?: Event | null
  initialDate?: Date
  onSubmit: (data: EventFormData) => void
  onCancel?: () => void
  isSubmitting?: boolean
}

export interface EventFormData {
  title: string
  description?: string
  location?: string
  startDate: Date
  endDate?: Date
  isAllDay: boolean
  clientId?: string | null
}

export function EventForm({
  event,
  initialDate,
  onSubmit,
  onCancel,
  isSubmitting = false
}: EventFormProps) {
  const { t } = useTranslation()
  const utils = trpc.useUtils()

  // Form state
  const [title, setTitle] = useState(event?.title || '')
  const [description, setDescription] = useState(event?.description || '')
  const [location, setLocation] = useState(event?.location || '')
  const [startDate, setStartDate] = useState(
    event?.startDate ? new Date(event.startDate) : (initialDate || new Date())
  )
  const [endDate, setEndDate] = useState<Date | undefined>(
    event?.endDate ? new Date(event.endDate) : undefined
  )
  const [isAllDay, setIsAllDay] = useState(event?.isAllDay || false)
  const [clientId, setClientId] = useState<string | null>(event?.clientId || null)
  const [showClientForm, setShowClientForm] = useState(false)

  // Fetch selected client details
  const { data: selectedClient } = trpc.clients.get.useQuery(
    { id: clientId! },
    {
      enabled: !!clientId
    }
  )

  // Update client mutation
  const updateClientMutation = trpc.clients.update.useMutation({
    onSuccess: () => {
      // Invalidate client queries to refresh data
      utils.clients.get.invalidate({ id: clientId! })
      utils.clients.search.invalidate()
      setShowClientForm(false)
    }
  })

  const handleUpdateClient = (formData: ClientFormData) => {
    if (!clientId) return

    updateClientMutation.mutate({
      id: clientId,
      ...formData
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      location: location.trim() || undefined,
      startDate,
      endDate,
      isAllDay,
      clientId
    })
  }

  const isValid = title.trim().length > 0

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title">{t('events.eventTitle')}</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t('events.eventTitle')}
          disabled={isSubmitting}
          autoFocus
        />
      </div>

      {/* Client */}
      <div className="space-y-2">
        <Label htmlFor="client">{t('clients.client')}</Label>
        <ClientCombobox
          value={clientId}
          onValueChange={(value) => {
            setClientId(value)
            setShowClientForm(false) // Hide form when changing client
          }}
          disabled={isSubmitting}
        />

        {/* Show Edit button when a client is selected */}
        {clientId && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowClientForm(!showClientForm)}
            disabled={isSubmitting}
          >
            {showClientForm ? t('common.cancel') : t('common.edit')} {t('clients.client')}
          </Button>
        )}
      </div>

      {/* Client Edit Form */}
      {showClientForm && selectedClient && (
        <div className="border rounded-lg p-4 space-y-4 bg-muted/50">
          <h4 className="font-medium">{t('common.edit')} {t('clients.client')}</h4>
          <ClientForm
            client={selectedClient}
            onSubmit={handleUpdateClient}
            onCancel={() => setShowClientForm(false)}
            isSubmitting={updateClientMutation.isPending}
          />
        </div>
      )}

      {/* Start Date */}
      <div className="space-y-2">
        <Label htmlFor="startDate">{t('events.startDate')}</Label>
        <div className="flex gap-2">
          <Input
            id="startDate"
            type="date"
            value={format(startDate, 'yyyy-MM-dd')}
            onChange={(e) => setStartDate(new Date(e.target.value))}
            disabled={isSubmitting}
            className="flex-1"
          />
          {!isAllDay && (
            <Input
              type="time"
              value={format(startDate, 'HH:mm')}
              onChange={(e) => {
                const [hours, minutes] = e.target.value.split(':')
                const newDate = new Date(startDate)
                newDate.setHours(parseInt(hours), parseInt(minutes))
                setStartDate(newDate)
              }}
              disabled={isSubmitting}
            />
          )}
        </div>
      </div>

      {/* End Date */}
      <div className="space-y-2">
        <Label htmlFor="endDate">{t('events.endDate')}</Label>
        <div className="flex gap-2">
          <Input
            id="endDate"
            type="date"
            value={endDate ? format(endDate, 'yyyy-MM-dd') : ''}
            onChange={(e) => setEndDate(e.target.value ? new Date(e.target.value) : undefined)}
            disabled={isSubmitting}
            className="flex-1"
          />
          {!isAllDay && endDate && (
            <Input
              type="time"
              value={endDate ? format(endDate, 'HH:mm') : ''}
              onChange={(e) => {
                if (!endDate) return
                const [hours, minutes] = e.target.value.split(':')
                const newDate = new Date(endDate)
                newDate.setHours(parseInt(hours), parseInt(minutes))
                setEndDate(newDate)
              }}
              disabled={isSubmitting}
            />
          )}
        </div>
      </div>

      {/* All Day */}
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="allDay"
          checked={isAllDay}
          onChange={(e) => setIsAllDay(e.target.checked)}
          disabled={isSubmitting}
          className="h-4 w-4"
        />
        <Label htmlFor="allDay" className="cursor-pointer">
          {t('events.allDay')}
        </Label>
      </div>

      {/* Location */}
      <div className="space-y-2">
        <Label htmlFor="location">{t('events.eventLocation')}</Label>
        <Input
          id="location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder={t('events.eventLocation')}
          disabled={isSubmitting}
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">{t('events.eventDescription')}</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t('events.eventDescription')}
          disabled={isSubmitting}
          rows={3}
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            {t('common.cancel')}
          </Button>
        )}
        <Button
          type="submit"
          disabled={!isValid || isSubmitting}
        >
          {isSubmitting ? t('common.loading') : (event ? t('common.save') : t('common.create'))}
        </Button>
      </div>
    </form>
  )
}