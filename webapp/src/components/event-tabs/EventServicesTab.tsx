import { EventServiceSection } from '@/components/events/EventServiceSection'

interface EventServicesTabProps {
  event: any
}

export function EventServicesTab({ event }: EventServicesTabProps) {
  return <EventServiceSection event={event} />
}
