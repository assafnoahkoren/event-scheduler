import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { trpc } from '@/utils/trpc'
import { useCurrentOrg } from '@/contexts/CurrentOrgContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
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
import { Label } from '@/components/ui/label'
import { Plus, Search, Loader2, Package, Pencil, Trash2, Users } from 'lucide-react'
import { toast } from 'sonner'
import type { inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from '@/../../server/src/routers/appRouter'

type RouterOutput = inferRouterOutputs<AppRouter>
type ComponentType = RouterOutput['floorPlans']['componentTypes']['list'][0]

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

export function ComponentTypes() {
  const { t } = useTranslation()
  const { currentOrg } = useCurrentOrg()
  const [searchQuery, setSearchQuery] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingComponentType, setEditingComponentType] = useState<ComponentType | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [componentTypeToDelete, setComponentTypeToDelete] = useState<ComponentType | null>(null)
  const [formData, setFormData] = useState<ComponentTypeFormData>(defaultFormData)

  const utils = trpc.useUtils()

  const { data: componentTypes, isLoading } = trpc.floorPlans.componentTypes.list.useQuery(
    { organizationId: currentOrg?.id || '' },
    { enabled: !!currentOrg?.id }
  )

  const { data: categories } = trpc.floorPlans.componentTypes.listCategories.useQuery(
    { organizationId: currentOrg?.id || '' },
    { enabled: !!currentOrg?.id }
  )

  const createMutation = trpc.floorPlans.componentTypes.create.useMutation({
    onSuccess: () => {
      toast.success(t('componentTypes.createSuccess'))
      utils.floorPlans.componentTypes.list.invalidate()
      utils.floorPlans.componentTypes.listCategories.invalidate()
      handleCloseDialog()
    },
    onError: (error) => {
      toast.error(t('componentTypes.createError'), { description: error.message })
    },
  })

  const updateMutation = trpc.floorPlans.componentTypes.update.useMutation({
    onSuccess: () => {
      toast.success(t('componentTypes.updateSuccess'))
      utils.floorPlans.componentTypes.list.invalidate()
      utils.floorPlans.componentTypes.listCategories.invalidate()
      handleCloseDialog()
    },
    onError: (error) => {
      toast.error(t('componentTypes.updateError'), { description: error.message })
    },
  })

  const deleteMutation = trpc.floorPlans.componentTypes.delete.useMutation({
    onSuccess: () => {
      toast.success(t('componentTypes.deleteSuccess'))
      utils.floorPlans.componentTypes.list.invalidate()
      utils.floorPlans.componentTypes.listCategories.invalidate()
      setDeleteDialogOpen(false)
      setComponentTypeToDelete(null)
    },
    onError: (error) => {
      toast.error(t('componentTypes.deleteError'), { description: error.message })
    },
  })

  const handleOpenCreate = () => {
    setEditingComponentType(null)
    setFormData(defaultFormData)
    setDialogOpen(true)
  }

  const handleOpenEdit = (componentType: ComponentType) => {
    setEditingComponentType(componentType)
    setFormData({
      name: componentType.name,
      category: componentType.category,
      icon: componentType.icon || '',
      defaultWidthInMeters: componentType.defaultWidthInMeters.toString(),
      defaultHeightInMeters: componentType.defaultHeightInMeters.toString(),
      occupancy: componentType.occupancy?.toString() || '',
      color: componentType.color || '',
      borderRadius: componentType.borderRadius?.toString() || '',
    })
    setDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setEditingComponentType(null)
    setFormData(defaultFormData)
  }

  const handleSubmit = () => {
    if (!currentOrg?.id) return

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
      updateMutation.mutate({
        id: editingComponentType.id,
        ...data,
      })
    } else {
      createMutation.mutate({
        organizationId: currentOrg.id,
        ...data,
      })
    }
  }

  const handleDelete = (componentType: ComponentType) => {
    setComponentTypeToDelete(componentType)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = () => {
    if (componentTypeToDelete) {
      deleteMutation.mutate({ id: componentTypeToDelete.id })
    }
  }

  const isFormValid = () => {
    return (
      formData.name.trim() &&
      formData.category.trim() &&
      parseFloat(formData.defaultWidthInMeters) > 0 &&
      parseFloat(formData.defaultHeightInMeters) > 0
    )
  }

  // Filter and group component types by category
  const filteredComponentTypes = componentTypes?.filter((ct) =>
    ct.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ct.category.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const groupedByCategory = filteredComponentTypes?.reduce((acc, ct) => {
    if (!acc[ct.category]) {
      acc[ct.category] = []
    }
    acc[ct.category].push(ct)
    return acc
  }, {} as Record<string, ComponentType[]>)

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <div className="container mx-auto px-4 py-4 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold">{t('componentTypes.title')}</h1>
          <Button onClick={handleOpenCreate}>
            <Plus className="h-4 w-4 me-2" />
            {t('componentTypes.newComponentType')}
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder={t('componentTypes.searchComponentTypes')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="ps-9"
          />
        </div>
      </div>

      {/* Component Types List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : !groupedByCategory || Object.keys(groupedByCategory).length === 0 ? (
        <div className="text-center py-16">
          <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            {searchQuery ? t('componentTypes.noComponentTypesFound') : t('componentTypes.noComponentTypes')}
          </h3>
          <p className="text-sm text-muted-foreground mb-6">
            {searchQuery ? t('componentTypes.tryAdjustingSearch') : t('componentTypes.noComponentTypesDescription')}
          </p>
          {!searchQuery && (
            <Button onClick={handleOpenCreate}>
              <Plus className="h-4 w-4 me-2" />
              {t('componentTypes.createComponentType')}
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedByCategory).map(([category, types]) => (
            <Card key={category}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>{category}</span>
                  <Badge variant="secondary">{types.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="divide-y">
                  {types.map((componentType) => (
                    <div
                      key={componentType.id}
                      className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {/* Color preview */}
                        <div
                          className="w-8 h-8 flex-shrink-0 border"
                          style={{
                            backgroundColor: componentType.color || '#E5E7EB',
                            borderRadius: componentType.borderRadius ? `${componentType.borderRadius}px` : '4px',
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{componentType.name}</div>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                            <span>
                              {componentType.defaultWidthInMeters}m × {componentType.defaultHeightInMeters}m
                            </span>
                            {componentType.occupancy && (
                              <span className="flex items-center gap-1">
                                <Users className="h-3.5 w-3.5" />
                                {componentType.occupancy}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEdit(componentType)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(componentType)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
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
                list="categories"
              />
              {categories && categories.length > 0 && (
                <datalist id="categories">
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

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSubmit} disabled={!isFormValid() || isPending}>
              {isPending && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
              {editingComponentType ? t('common.save') : t('common.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('componentTypes.confirmDeleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('componentTypes.confirmDeleteDescription', { name: componentTypeToDelete?.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? t('common.deleting') : t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
