import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import { EventForm, type EventFormData } from '@/components/EventForm'
import { EventCostsSection } from '@/components/events/EventCostsSection'
import { useTranslation } from 'react-i18next'

interface EventDetailsTabProps {
  eventId: string
  event: any
  onUpdate: (formData: EventFormData) => void
  onDeleteClick: () => void
  isUpdating: boolean
  isDeleting: boolean
}

export function EventDetailsTab({
  eventId,
  event,
  onUpdate,
  onDeleteClick,
  isUpdating,
  isDeleting,
}: EventDetailsTabProps) {
  const { t } = useTranslation()

  return (
    <div className="space-y-4">
      {/* Event Costs Section */}
      <EventCostsSection eventId={eventId} />

      <EventForm event={event} onSubmit={onUpdate} isSubmitting={isUpdating} />

      <div className="pt-4 border-t">
        <Button
          variant="destructive"
          onClick={onDeleteClick}
          disabled={isDeleting}
        >
          <Trash2 className="h-4 w-4 me-2" />
          {t('events.deleteEvent')}
        </Button>
      </div>
    </div>
  )
}
