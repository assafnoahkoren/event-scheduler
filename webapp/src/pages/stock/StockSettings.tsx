import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Trash2, Pencil } from 'lucide-react'
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

type EditingItem = { id: string; name: string; unit: string; categoryId: string }
type EditingCategory = { id: string; name: string }
type EditingLocation = { id: string; name: string; description: string }

export function StockSettings() {
  const { t } = useTranslation()
  const { currentSite } = useCurrentSite()

  // Item form state
  const [itemSheetOpen, setItemSheetOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<EditingItem | null>(null)
  const [newItemName, setNewItemName] = useState('')
  const [newItemUnit, setNewItemUnit] = useState('')
  const [newItemCategoryId, setNewItemCategoryId] = useState<string>('')

  // Location form state
  const [locationSheetOpen, setLocationSheetOpen] = useState(false)
  const [editingLocation, setEditingLocation] = useState<EditingLocation | null>(null)
  const [newLocationName, setNewLocationName] = useState('')

  // Category form state
  const [categorySheetOpen, setCategorySheetOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<EditingCategory | null>(null)
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
  const updateItem = trpc.stock.items.update.useMutation()
  const createLocation = trpc.stock.locations.create.useMutation()
  const updateLocation = trpc.stock.locations.update.useMutation()
  const createCategory = trpc.stock.categories.create.useMutation()
  const updateCategory = trpc.stock.categories.update.useMutation()
  const deleteCategory = trpc.stock.categories.delete.useMutation()

  // Item handlers
  const openNewItem = () => {
    setEditingItem(null)
    setNewItemName('')
    setNewItemUnit('')
    setNewItemCategoryId('')
    setItemSheetOpen(true)
  }

  const openEditItem = (item: NonNullable<typeof items>[0]) => {
    setEditingItem({ id: item.id, name: item.name, unit: item.unit, categoryId: item.category?.id ?? '' })
    setNewItemName(item.name)
    setNewItemUnit(item.unit)
    setNewItemCategoryId(item.category?.id ?? '')
    setItemSheetOpen(true)
  }

  const handleSaveItem = async () => {
    if (!currentSite || !newItemName || !newItemUnit) return
    if (editingItem) {
      await updateItem.mutateAsync({
        id: editingItem.id,
        name: newItemName,
        unit: newItemUnit,
        categoryId: newItemCategoryId || null,
      })
    } else {
      await createItem.mutateAsync({
        siteId: currentSite.id,
        name: newItemName,
        unit: newItemUnit,
        categoryId: newItemCategoryId || undefined,
      })
    }
    await refetchItems()
    setItemSheetOpen(false)
  }

  // Location handlers
  const openNewLocation = () => {
    setEditingLocation(null)
    setNewLocationName('')
    setLocationSheetOpen(true)
  }

  const openEditLocation = (loc: NonNullable<typeof locations>[0]) => {
    setEditingLocation({ id: loc.id, name: loc.name, description: loc.description ?? '' })
    setNewLocationName(loc.name)
    setLocationSheetOpen(true)
  }

  const handleSaveLocation = async () => {
    if (!currentSite || !newLocationName) return
    if (editingLocation) {
      await updateLocation.mutateAsync({ id: editingLocation.id, name: newLocationName })
    } else {
      await createLocation.mutateAsync({ siteId: currentSite.id, name: newLocationName })
    }
    await refetchLocations()
    setLocationSheetOpen(false)
  }

  // Category handlers
  const openNewCategory = () => {
    setEditingCategory(null)
    setNewCategoryName('')
    setCategorySheetOpen(true)
  }

  const openEditCategory = (cat: NonNullable<typeof categories>[0]) => {
    setEditingCategory({ id: cat.id, name: cat.name })
    setNewCategoryName(cat.name)
    setCategorySheetOpen(true)
  }

  const handleSaveCategory = async () => {
    if (!currentSite || !newCategoryName) return
    if (editingCategory) {
      await updateCategory.mutateAsync({ id: editingCategory.id, name: newCategoryName })
    } else {
      await createCategory.mutateAsync({ siteId: currentSite.id, name: newCategoryName })
    }
    await refetchCategories()
    setCategorySheetOpen(false)
  }

  const handleDeleteCategory = async (id: string) => {
    await deleteCategory.mutateAsync({ id })
    await refetchCategories()
  }

  if (!currentSite) return null

  const itemPending = createItem.isPending || updateItem.isPending
  const locationPending = createLocation.isPending || updateLocation.isPending
  const categoryPending = createCategory.isPending || updateCategory.isPending

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
            <Button size="sm" onClick={openNewItem}>
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
                <Button variant="ghost" size="icon" onClick={() => openEditItem(item)}>
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Categories tab */}
        <TabsContent value="categories" className="mt-4">
          <div className="flex justify-end mb-3">
            <Button size="sm" onClick={openNewCategory}>
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
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEditCategory(cat)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDeleteCategory(cat.id)}
                    disabled={deleteCategory.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Locations tab */}
        <TabsContent value="locations" className="mt-4">
          <div className="flex justify-end mb-3">
            <Button size="sm" onClick={openNewLocation}>
              + {t('stock.actions.newLocation')}
            </Button>
          </div>
          <div className="space-y-2">
            {locations?.map((loc) => (
              <div key={loc.id} className="border rounded-lg px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium">{loc.name}</p>
                  {loc.description && <p className="text-xs text-muted-foreground">{loc.description}</p>}
                </div>
                <Button variant="ghost" size="icon" onClick={() => openEditLocation(loc)}>
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Item Sheet (create + edit) */}
      <Sheet open={itemSheetOpen} onOpenChange={setItemSheetOpen}>
        <SheetContent side="bottom" className="h-[60vh] flex flex-col gap-4">
          <SheetHeader>
            <SheetTitle>{editingItem ? t('stock.actions.editItem') : t('stock.actions.newItem')}</SheetTitle>
          </SheetHeader>
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
              onClick={handleSaveItem}
              disabled={!newItemName || !newItemUnit || itemPending}
              className="w-full"
            >
              {itemPending ? t('stock.common.saving') : editingItem ? t('common.save') : t('stock.common.addItem')}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Category Sheet (create + edit) */}
      <Sheet open={categorySheetOpen} onOpenChange={setCategorySheetOpen}>
        <SheetContent side="bottom" className="h-[40vh] flex flex-col gap-4">
          <SheetHeader>
            <SheetTitle>{editingCategory ? t('stock.actions.editCategory') : t('stock.actions.newCategory')}</SheetTitle>
          </SheetHeader>
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
              onClick={handleSaveCategory}
              disabled={!newCategoryName || categoryPending}
              className="w-full"
            >
              {categoryPending ? t('stock.common.saving') : editingCategory ? t('common.save') : t('stock.common.addCategory')}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Location Sheet (create + edit) */}
      <Sheet open={locationSheetOpen} onOpenChange={setLocationSheetOpen}>
        <SheetContent side="bottom" className="h-[40vh] flex flex-col gap-4">
          <SheetHeader>
            <SheetTitle>{editingLocation ? t('stock.actions.editLocation') : t('stock.actions.newLocation')}</SheetTitle>
          </SheetHeader>
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
              onClick={handleSaveLocation}
              disabled={!newLocationName || locationPending}
              className="w-full"
            >
              {locationPending ? t('stock.common.saving') : editingLocation ? t('common.save') : t('stock.common.addLocation')}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
