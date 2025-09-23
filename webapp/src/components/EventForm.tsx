import { useState, useRef, useEffect } from 'react'
import { format } from 'date-fns'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  initialClientId?: string | null
  onSubmit: (data: EventFormData) => void
  onCancel?: () => void
  isSubmitting?: boolean
}

export interface EventFormData {
  title: string
  description?: string
  startDate: Date
  endDate?: Date
  isAllDay: boolean
  clientId?: string | null
  status?: 'DRAFT' | 'SCHEDULED' | 'CANCELLED'
}

export function EventForm({
  event,
  initialDate,
  initialClientId,
  onSubmit,
  onCancel,
  isSubmitting = false
}: EventFormProps) {
  const { t } = useTranslation()
  const utils = trpc.useUtils()
  const descriptionRef = useRef<HTMLTextAreaElement>(null)

  // Form state
  const [title, setTitle] = useState(event?.title || '')
  const [description, setDescription] = useState(event?.description || '')
  const [startDate, setStartDate] = useState(
    event?.startDate ? new Date(event.startDate) : (initialDate || new Date())
  )
  const [endDate, setEndDate] = useState<Date | undefined>(
    event?.endDate ? new Date(event.endDate) : undefined
  )
  const [isAllDay, setIsAllDay] = useState(event?.isAllDay || false)
  const [clientId, setClientId] = useState<string | null>(event?.clientId || initialClientId || null)
  const [status, setStatus] = useState<'DRAFT' | 'SCHEDULED' | 'CANCELLED'>(
    event?.status || 'DRAFT'
  )
  const [showClientForm, setShowClientForm] = useState(false)

  // Auto-resize textarea
  useEffect(() => {
    const textarea = descriptionRef.current
    if (textarea) {
      // Reset height to auto to get the correct scrollHeight
      textarea.style.height = 'auto'
      // Set the height to scrollHeight, but cap at max height (200px)
      const scrollHeight = textarea.scrollHeight
      const maxHeight = 200 // Maximum height in pixels
      textarea.style.height = `${Math.min(scrollHeight, maxHeight)}px`
    }
  }, [description])

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
      startDate,
      endDate,
      isAllDay,
      clientId,
      status
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
            {showClientForm && t('common.cancel')} {t('common.edit')} {t('clients.client')}
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

      {/* Date and Status in same row */}
      <div className="grid grid-cols-2 gap-4">
        {/* Date */}
        <div className="space-y-2">
          <Label htmlFor="date">{t('events.date')}</Label>
          <Input
            id="date"
            type="date"
            value={format(startDate, 'yyyy-MM-dd')}
            onChange={(e) => setStartDate(new Date(e.target.value))}
            disabled={isSubmitting}
          />
        </div>

        {/* Status */}
        <div className="space-y-2">
          <Label htmlFor="status">{t('events.status')}</Label>
          <Select value={status} onValueChange={(value: any) => setStatus(value)} disabled={isSubmitting}>
            <SelectTrigger id="status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DRAFT">{t('events.draft')}</SelectItem>
              <SelectItem value="SCHEDULED">{t('events.scheduled')}</SelectItem>
              <SelectItem value="CANCELLED">{t('events.cancelled')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">{t('events.eventDescription')}</Label>
        <Textarea
          ref={descriptionRef}
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t('events.eventDescription')}
          disabled={isSubmitting}
          className="resize-none overflow-auto min-h-[80px] transition-height"
          style={{ height: '80px' }}
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