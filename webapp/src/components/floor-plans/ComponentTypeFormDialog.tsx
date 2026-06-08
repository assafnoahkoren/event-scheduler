import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { trpc } from '@/utils/trpc'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Loader2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from '@/../../server/src/routers/appRouter'

type RouterOutput = inferRouterOutputs<AppRouter>
export type ComponentType = RouterOutput['floorPlans']['componentTypes']['list'][0]

interface ComponentTypeFormData {
  name: string
  category: string
  icon: string
  defaultWidthInMeters: string
  defaultHeightInMeters: string
  occupancy: string
  color: string
  borderRadius: string
}

const defaultFormData: ComponentTypeFormData = {
  name: '',
  category: '',
  icon: '',
  defaultWidthInMeters: '1',
  defaultHeightInMeters: '1',
  occupancy: '',
  color: '',
  borderRadius: '',
}

const presetColors = [
  '#EF4444', // red
  '#F97316', // orange
  '#EAB308', // yellow
  '#22C55E', // green
  '#14B8A6', // teal
  '#3B82F6', // blue
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#6B7280', // gray
  '#1F2937', // dark gray
]

interface ComponentTypeFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  organizationId: string
  /** When provided, the dialog is in edit mode; otherwise it creates a new component type. */
  editingComponentType?: ComponentType | null
  /** Called after a successful create or update with the saved component type. */
  onSuccess?: (componentType: ComponentType) => void
}

export function ComponentTypeFormDialog({
  open,
  onOpenChange,
  organizationId,
  editingComponentType,
  onSuccess,
}: ComponentTypeFormDialogProps) {
  const { t } = useTranslation()
  const utils = trpc.useUtils()
  const [formData, setFormData] = useState<ComponentTypeFormData>(defaultFormData)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)

  const { data: categories } = trpc.floorPlans.componentTypes.listCategories.useQuery(
    { organizationId },
    { enabled: !!organizationId }
  )

  // Sync form state whenever the dialog opens (for create) or the target changes (for edit)
  useEffect(() => {
    if (!open) return
    if (editingComponentType) {
      setFormData({
        name: editingComponentType.name,
        category: editingComponentType.category,
        icon: editingComponentType.icon || '',
        defaultWidthInMeters: editingComponentType.defaultWidthInMeters.toString(),
        defaultHeightInMeters: editingComponentType.defaultHeightInMeters.toString(),
        occupancy: editingComponentType.occupancy?.toString() || '',
        color: editingComponentType.color || '',
        borderRadius: editingComponentType.borderRadius?.toString() || '',
      })
    } else {
      setFormData(defaultFormData)
    }
  }, [open, editingComponentType])

  const invalidate = () => {
    utils.floorPlans.componentTypes.list.invalidate()
    utils.floorPlans.componentTypes.listCategories.invalidate()
  }

  const createMutation = trpc.floorPlans.componentTypes.create.useMutation({
    onSuccess: (componentType) => {
      toast.success(t('componentTypes.createSuccess'))
      invalidate()
      onSuccess?.(componentType)
      onOpenChange(false)
    },
    onError: (error) => {
      toast.error(t('componentTypes.createError'), { description: error.message })
    },
  })

  const updateMutation = trpc.floorPlans.componentTypes.update.useMutation({
    onSuccess: (componentType) => {
      toast.success(t('componentTypes.updateSuccess'))
      invalidate()
      onSuccess?.(componentType)
      onOpenChange(false)
    },
    onError: (error) => {
      toast.error(t('componentTypes.updateError'), { description: error.message })
    },
  })

  const deleteMutation = trpc.floorPlans.componentTypes.delete.useMutation({
    onSuccess: () => {
      toast.success(t('componentTypes.deleteSuccess'))
      invalidate()
      setDeleteConfirmOpen(false)
      onOpenChange(false)
    },
    onError: (error) => {
      toast.error(t('componentTypes.deleteError'), { description: error.message })
    },
  })

  const isPending = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending

  const isFormValid = () => {
    return (
      !!formData.name.trim() &&
      !!formData.category.trim() &&
      parseFloat(formData.defaultWidthInMeters) > 0 &&
      parseFloat(formData.defaultHeightInMeters) > 0
    )
  }

  const handleSubmit = () => {
    if (!organizationId) return

    const data = {
      name: formData.name.trim(),
      category: formData.category.trim(),
      icon: formData.icon.trim() || undefined,
      defaultWidthInMeters: parseFloat(formData.defaultWidthInMeters),
      defaultHeightInMeters: parseFloat(formData.defaultHeightInMeters),
      occupancy: formData.occupancy ? parseInt(formData.occupancy, 10) : undefined,
      color: formData.color.trim() || undefined,
      borderRadius: formData.borderRadius ? parseFloat(formData.borderRadius) : undefined,
    }

    if (editingComponentType) {
      updateMutation.mutate({ id: editingComponentType.id, ...data })
    } else {
      createMutation.mutate({ organizationId, ...data })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editingComponentType
              ? t('componentTypes.editComponentType')
              : t('componentTypes.newComponentType')}
          </DialogTitle>
          <DialogDescription>
            {t('componentTypes.componentTypeDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t('componentTypes.name')}</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={t('componentTypes.namePlaceholder')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">{t('componentTypes.category')}</Label>
            <Input
              id="category"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              placeholder={t('componentTypes.categoryPlaceholder')}
              list="component-type-categories"
            />
            {categories && categories.length > 0 && (
              <datalist id="component-type-categories">
                {categories.map((cat) => (
                  <option key={cat} value={cat} />
                ))}
              </datalist>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="width">{t('componentTypes.defaultWidth')}</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="width"
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={formData.defaultWidthInMeters}
                  onChange={(e) => setFormData({ ...formData, defaultWidthInMeters: e.target.value })}
                />
                <span className="text-sm text-muted-foreground">m</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="height">{t('componentTypes.defaultHeight')}</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="height"
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={formData.defaultHeightInMeters}
                  onChange={(e) => setFormData({ ...formData, defaultHeightInMeters: e.target.value })}
                />
                <span className="text-sm text-muted-foreground">m</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="occupancy">
              {t('componentTypes.occupancy')}
              <span className="text-muted-foreground ms-1">({t('common.optional')})</span>
            </Label>
            <Input
              id="occupancy"
              type="number"
              min="1"
              step="1"
              value={formData.occupancy}
              onChange={(e) => setFormData({ ...formData, occupancy: e.target.value })}
              placeholder={t('componentTypes.occupancyPlaceholder')}
            />
          </div>

          {/* Color picker */}
          <div className="space-y-2">
            <Label>
              {t('componentTypes.color')}
              <span className="text-muted-foreground ms-1">({t('common.optional')})</span>
            </Label>
            <div className="flex items-center gap-3">
              <div className="flex gap-1 flex-wrap">
                {presetColors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`w-6 h-6 rounded border-2 transition-all ${
                      formData.color === color ? 'border-primary scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setFormData({ ...formData, color })}
                  />
                ))}
                {formData.color && (
                  <button
                    type="button"
                    className="w-6 h-6 rounded border-2 border-dashed border-muted-foreground flex items-center justify-center text-muted-foreground text-xs"
                    onClick={() => setFormData({ ...formData, color: '' })}
                    title={t('common.clear')}
                  >
                    ×
                  </button>
                )}
              </div>
              <Input
                type="color"
                value={formData.color || '#6B7280'}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="w-10 h-8 p-0 border-0 cursor-pointer"
              />
            </div>
          </div>

          {/* Border radius */}
          <div className="space-y-2">
            <Label htmlFor="borderRadius">
              {t('componentTypes.borderRadius')}
              <span className="text-muted-foreground ms-1">({t('common.optional')})</span>
            </Label>
            <div className="flex items-center gap-3">
              <Input
                id="borderRadius"
                type="number"
                min="0"
                step="1"
                value={formData.borderRadius}
                onChange={(e) => setFormData({ ...formData, borderRadius: e.target.value })}
                placeholder="0"
                className="w-20"
              />
              <span className="text-sm text-muted-foreground">px</span>
              <Button
                type="button"
                variant={formData.borderRadius === '99999' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFormData({ ...formData, borderRadius: '99999' })}
              >
                {t('componentTypes.round')}
              </Button>
              {/* Preview */}
              <div
                className="w-10 h-10 border ms-auto"
                style={{
                  backgroundColor: formData.color || '#E5E7EB',
                  borderRadius: formData.borderRadius ? `${formData.borderRadius}px` : '0px',
                }}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="sm:justify-between">
          {editingComponentType ? (
            <Button
              variant="ghost"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setDeleteConfirmOpen(true)}
              disabled={isPending}
            >
              <Trash2 className="h-4 w-4 me-2" />
              {t('common.delete')}
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSubmit} disabled={!isFormValid() || isPending}>
              {isPending && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
              {editingComponentType ? t('common.save') : t('common.create')}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('componentTypes.confirmDeleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('componentTypes.confirmDeleteDescription', { name: editingComponentType?.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => editingComponentType && deleteMutation.mutate({ id: editingComponentType.id })}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  )
}
