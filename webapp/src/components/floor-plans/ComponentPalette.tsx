import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Plus, Pencil } from 'lucide-react'
import type { ComponentType } from './ComponentTypeFormDialog'

interface ComponentPaletteProps {
  componentTypes: ComponentType[] | undefined
  /** Tap a palette item to add one instance to the canvas. */
  onAdd: (componentType: ComponentType) => void
  /** Edit the component type (opens the component-type form in edit mode). */
  onEdit: (componentType: ComponentType) => void
  /** Open the "new component type" dialog. */
  onNewType: () => void
}

export function ComponentPalette({ componentTypes, onAdd, onEdit, onNewType }: ComponentPaletteProps) {
  const { t } = useTranslation()

  const grouped = (componentTypes ?? []).reduce((acc, ct) => {
    ;(acc[ct.category] ||= []).push(ct)
    return acc
  }, {} as Record<string, ComponentType[]>)

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b flex items-center justify-between gap-2">
        <h2 className="font-medium">{t('templateEditor.components')}</h2>
        <Button variant="outline" size="sm" onClick={onNewType}>
          <Plus className="h-4 w-4 me-1" />
          {t('componentTypes.newComponentType')}
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-4">
        {Object.entries(grouped).map(([category, types]) => (
          <div key={category}>
            <h3 className="text-xs font-medium text-muted-foreground mb-2 px-2">{category}</h3>
            <div className="space-y-1">
              {types.map((ct) => (
                <div
                  key={ct.id}
                  className="w-full flex items-center gap-1 p-2 rounded-md hover:bg-muted"
                >
                  <button
                    type="button"
                    onClick={() => onAdd(ct)}
                    className="flex items-center gap-2 flex-1 min-w-0 text-start"
                  >
                    <div
                      className="w-8 h-8 flex-shrink-0 border"
                      style={{
                        backgroundColor: ct.color || '#E5E7EB',
                        borderRadius: ct.borderRadius ? `${Math.min(ct.borderRadius, 12)}px` : '2px',
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm truncate">{ct.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {ct.defaultWidthInMeters}m × {ct.defaultHeightInMeters}m
                      </div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => onEdit(ct)}
                    aria-label={t('common.edit')}
                    className="flex-shrink-0 p-1.5 rounded-md text-muted-foreground hover:bg-background hover:text-foreground"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onAdd(ct)}
                    aria-label={t('common.add')}
                    className="flex-shrink-0 p-1.5 rounded-md text-muted-foreground hover:bg-background hover:text-foreground"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
