import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { trpc } from '@/utils/trpc'
import { useCurrentOrg } from '@/contexts/CurrentOrgContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
import { Plus, Search, Loader2, Package, Pencil, Trash2, Users } from 'lucide-react'
import { toast } from 'sonner'
import { ComponentTypeFormDialog } from '@/components/floor-plans/ComponentTypeFormDialog'
import type { inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from '@/../../server/src/routers/appRouter'

type RouterOutput = inferRouterOutputs<AppRouter>
type ComponentType = RouterOutput['floorPlans']['componentTypes']['list'][0]

export function ComponentTypes() {
  const { t } = useTranslation()
  const { currentOrg } = useCurrentOrg()
  const [searchQuery, setSearchQuery] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingComponentType, setEditingComponentType] = useState<ComponentType | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [componentTypeToDelete, setComponentTypeToDelete] = useState<ComponentType | null>(null)

  const utils = trpc.useUtils()

  const { data: componentTypes, isLoading } = trpc.floorPlans.componentTypes.list.useQuery(
    { organizationId: currentOrg?.id || '' },
    { enabled: !!currentOrg?.id }
  )

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
    setDialogOpen(true)
  }

  const handleOpenEdit = (componentType: ComponentType) => {
    setEditingComponentType(componentType)
    setDialogOpen(true)
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

      {/* Create/Edit Dialog (shared with the template editor) */}
      <ComponentTypeFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        organizationId={currentOrg?.id || ''}
        editingComponentType={editingComponentType}
      />

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
