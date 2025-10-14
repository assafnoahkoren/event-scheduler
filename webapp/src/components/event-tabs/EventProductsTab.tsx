import { EventProductSection } from '@/components/events/EventProductSection'

interface EventProductsTabProps {
  event: any
}

export function EventProductsTab({ event }: EventProductsTabProps) {
  return <EventProductSection event={event} />
}
