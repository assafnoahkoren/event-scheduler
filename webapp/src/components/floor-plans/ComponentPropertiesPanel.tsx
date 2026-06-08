import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RotateCcw, RotateCw, Trash2, Pencil } from 'lucide-react'
import type { inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from '@/../../server/src/routers/appRouter'

type RouterOutput = inferRouterOutputs<AppRouter>
type TemplateComponent = RouterOutput['floorPlans']['templates']['get']['components'][0]

interface ComponentPropertiesPanelProps {
  component: TemplateComponent | null
  /** Rotate by a signed delta in degrees (e.g. +15, -15, +90). */
  onRotate: (deltaDeg: number) => void
  onDelete: () => void
  onEdit: () => void
  /** Compact = mobile bottom bar (icons only); false = full desktop panel. */
  compact?: boolean
}

export function ComponentPropertiesPanel({
  component, onRotate, onDelete, onEdit, compact = false,
}: ComponentPropertiesPanelProps) {
  const { t } = useTranslation()

  if (!component) {
    return compact ? null : (
      <p className="text-sm text-muted-foreground">{t('templateEditor.selectComponent')}</p>
    )
  }

  const rotateControls = (
    <div className="flex items-center gap-1">
      <Button variant="outline" size="icon" onClick={() => onRotate(-15)} aria-label="rotate left">
        <RotateCcw className="h-4 w-4" />
      </Button>
      <Button variant="outline" size="icon" onClick={() => onRotate(15)} aria-label="rotate right">
        <RotateCw className="h-4 w-4" />
      </Button>
      <Button variant="outline" size="icon" onClick={onEdit} aria-label="edit">
        <Pencil className="h-4 w-4" />
      </Button>
      <Button variant="destructive" size="icon" onClick={onDelete} aria-label="delete">
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )

  if (compact) {
    return (
      <div className="flex items-center justify-between gap-3 p-3">
        <div className="min-w-0">
          <div className="font-medium truncate">{component.componentType?.name}</div>
          <div className="text-xs text-muted-foreground">
            {component.widthInMeters.toFixed(1)}m × {component.heightInMeters.toFixed(1)}m · {Math.round(component.rotation)}°
          </div>
        </div>
        {rotateControls}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-muted-foreground">{t('templateEditor.type')}</Label>
        <p className="font-medium">{component.componentType?.name}</p>
      </div>
      <div>
        <Label className="text-muted-foreground">{t('templateEditor.position')}</Label>
        <p className="text-sm">
          X: {component.xInMeters.toFixed(2)}m, Y: {component.yInMeters.toFixed(2)}m
        </p>
      </div>
      <div>
        <Label className="text-muted-foreground">{t('templateEditor.size')}</Label>
        <p className="text-sm">
          {component.widthInMeters.toFixed(2)}m × {component.heightInMeters.toFixed(2)}m
        </p>
      </div>
      {component.label && (
        <div>
          <Label className="text-muted-foreground">{t('templateEditor.label')}</Label>
          <p className="font-medium">{component.label}</p>
        </div>
      )}
      <div className="pt-2">{rotateControls}</div>
    </div>
  )
}
