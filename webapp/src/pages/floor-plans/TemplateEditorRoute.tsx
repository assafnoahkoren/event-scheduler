import { useParams } from 'react-router-dom'
import { FloorPlanEditor } from './FloorPlanEditor'

export function TemplateEditorRoute() {
  const { templateId } = useParams<{ templateId: string }>()
  if (!templateId) return null
  return (
    <FloorPlanEditor
      source={{ kind: 'template', id: templateId }}
      getBackHref={(data) => `/floor-plans/${data.floorPlanId}`}
    />
  )
}
