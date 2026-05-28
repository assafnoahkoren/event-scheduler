import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Trash2 } from 'lucide-react'
import { trpc } from '@/utils/trpc'
import { useCurrentSite } from '@/contexts/CurrentSiteContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export function StockSettings() {
  const { t } = useTranslation()
  const { currentSite } = useCurrentSite()

  // Item form state
  const [itemSheetOpen, setItemSheetOpen] = useState(false)
  const [newItemName, setNewItemName] = useState('')
  const [newItemUnit, setNewItemUnit] = useState('')
  const [newItemCategoryId, setNewItemCategoryId] = useState<string>('')

  // Location form state
  const [locationSheetOpen, setLocationSheetOpen] = useState(false)
  const [newLocationName, setNewLocationName] = useState('')

  // Category form state
  const [categorySheetOpen, setCategorySheetOpen] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')

  const { data: items, refetch: refetchItems } = trpc.stock.items.list.useQuery(
    { siteId: currentSite?.id ?? '' },
    { enabled: !!currentSite }
  )
  const { data: locations, refetch: refetchLocations } = trpc.stock.locations.list.useQuery(
    { siteId: currentSite?.id ?? '' },
    { enabled: !!currentSite }
  )
  const { data: categories, refetch: refetchCategories } = trpc.stock.categories.list.useQuery(
    { siteId: currentSite?.id ?? '' },
    { enabled: !!currentSite }
  )

  const createItem = trpc.stock.items.create.useMutation()
  const createLocation = trpc.stock.locations.create.useMutation()
  const createCategory = trpc.stock.categories.create.useMutation()
  const deleteCategory = trpc.stock.categories.delete.useMutation()

  const handleCreateItem = async () => {
    if (!currentSite || !newItemName || !newItemUnit) return
    await createItem.mutateAsync({
      siteId: currentSite.id,
      name: newItemName,
      unit: newItemUnit,
      categoryId: newItemCategoryId || undefined,
    })
    await refetchItems()
    setItemSheetOpen(false)
    setNewItemName('')
    setNewItemUnit('')
    setNewItemCategoryId('')
  }

  const handleCreateLocation = async () => {
    if (!currentSite || !newLocationName) return
    await createLocation.mutateAsync({ siteId: currentSite.id, name: newLocationName })
    await refetchLocations()
    setLocationSheetOpen(false)
    setNewLocationName('')
  }

  const handleCreateCategory = async () => {
    if (!currentSite || !newCategoryName) return
    await createCategory.mutateAsync({ siteId: currentSite.id, name: newCategoryName })
    await refetchCategories()
    setCategorySheetOpen(false)
    setNewCategoryName('')
  }

  const handleDeleteCategory = async (id: string) => {
    await deleteCategory.mutateAsync({ id })
    await refetchCategories()
  }

  if (!currentSite) return null

  return (
    <div className="container mx-auto px-4 py-6 max-w-lg">
      <h1 className="text-2xl font-bold mb-4">{t('stock.settings')}</h1>

      <Tabs defaultValue="items">
        <TabsList className="w-full">
          <TabsTrigger value="items" className="flex-1">{t('stock.items')}</TabsTrigger>
          <TabsTrigger value="categories" className="flex-1">{t('stock.categories')}</TabsTrigger>
          <TabsTrigger value="locations" className="flex-1">{t('stock.locations')}</TabsTrigger>
        </TabsList>

        {/* Items tab */}
        <TabsContent value="items" className="mt-4">
          <div className="flex justify-end mb-3">
            <Button size="sm" onClick={() => setItemSheetOpen(true)}>
              + {t('stock.actions.newItem')}
            </Button>
          </div>
          <div className="space-y-2">
            {items?.map((item) => (
              <div key={item.id} className="border rounded-lg px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium">{item.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs text-muted-foreground">{item.unit}</p>
                    {item.category && (
                      <span className="text-xs bg-muted px-1.5 py-0.5 rounded">
                        {item.category.name}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Categories tab */}
        <TabsContent value="categories" className="mt-4">
          <div className="flex justify-end mb-3">
            <Button size="sm" onClick={() => setCategorySheetOpen(true)}>
              + {t('stock.actions.newCategory')}
            </Button>
          </div>
          <div className="space-y-2">
            {categories?.length === 0 && (
              <p className="text-sm text-muted-foreground">{t('stock.category.empty')}</p>
            )}
            {categories?.map((cat) => (
              <div key={cat.id} className="border rounded-lg px-4 py-3 flex items-center justify-between">
                <p className="font-medium">{cat.name}</p>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive shrink-0"
                  onClick={() => handleDeleteCategory(cat.id)}
                  disabled={deleteCategory.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Locations tab */}
        <TabsContent value="locations" className="mt-4">
          <div className="flex justify-end mb-3">
            <Button size="sm" onClick={() => setLocationSheetOpen(true)}>
              + {t('stock.actions.newLocation')}
            </Button>
          </div>
          <div className="space-y-2">
            {locations?.map((loc) => (
              <div key={loc.id} className="border rounded-lg px-4 py-3">
                <p className="font-medium">{loc.name}</p>
                {loc.description && <p className="text-xs text-muted-foreground">{loc.description}</p>}
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* New Item Sheet */}
      <Sheet open={itemSheetOpen} onOpenChange={setItemSheetOpen}>
        <SheetContent side="bottom" className="h-[60vh] flex flex-col gap-4">
          <SheetHeader><SheetTitle>{t('stock.actions.newItem')}</SheetTitle></SheetHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('stock.item.name')}</Label>
              <Input
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder={t('stock.item.namePlaceholder')}
              />
            </div>
            <div>
              <Label>{t('stock.item.unit')}</Label>
              <Input
                value={newItemUnit}
                onChange={(e) => setNewItemUnit(e.target.value)}
                placeholder={t('stock.item.unitPlaceholder')}
              />
            </div>
            {categories && categories.length > 0 && (
              <div>
                <Label>{t('stock.item.category')}</Label>
                <Select value={newItemCategoryId} onValueChange={setNewItemCategoryId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('stock.item.noCategory')} />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button
              onClick={handleCreateItem}
              disabled={!newItemName || !newItemUnit || createItem.isPending}
              className="w-full"
            >
              {createItem.isPending ? t('stock.common.saving') : t('stock.common.addItem')}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* New Category Sheet */}
      <Sheet open={categorySheetOpen} onOpenChange={setCategorySheetOpen}>
        <SheetContent side="bottom" className="h-[40vh] flex flex-col gap-4">
          <SheetHeader><SheetTitle>{t('stock.actions.newCategory')}</SheetTitle></SheetHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('stock.category.name')}</Label>
              <Input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder={t('stock.category.namePlaceholder')}
              />
            </div>
            <Button
              onClick={handleCreateCategory}
              disabled={!newCategoryName || createCategory.isPending}
              className="w-full"
            >
              {createCategory.isPending ? t('stock.common.saving') : t('stock.common.addCategory')}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* New Location Sheet */}
      <Sheet open={locationSheetOpen} onOpenChange={setLocationSheetOpen}>
        <SheetContent side="bottom" className="h-[40vh] flex flex-col gap-4">
          <SheetHeader><SheetTitle>{t('stock.actions.newLocation')}</SheetTitle></SheetHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('stock.location.name')}</Label>
              <Input
                value={newLocationName}
                onChange={(e) => setNewLocationName(e.target.value)}
                placeholder={t('stock.location.namePlaceholder')}
              />
            </div>
            <Button
              onClick={handleCreateLocation}
              disabled={!newLocationName || createLocation.isPending}
              className="w-full"
            >
              {createLocation.isPending ? t('stock.common.saving') : t('stock.common.addLocation')}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
