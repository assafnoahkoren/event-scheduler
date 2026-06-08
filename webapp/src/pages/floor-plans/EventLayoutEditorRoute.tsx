import { useParams } from 'react-router-dom'
import { FloorPlanEditor } from './FloorPlanEditor'

export function EventLayoutEditorRoute() {
  const { eventId, layoutId } = useParams<{ eventId: string; layoutId: string }>()
  if (!eventId || !layoutId) return null
  return (
    <FloorPlanEditor
      source={{ kind: 'eventLayout', id: layoutId }}
      getBackHref={() => `/event/${eventId}?tab=floor-plan`}
    />
  )
}
