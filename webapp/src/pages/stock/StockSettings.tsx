import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { trpc } from '@/utils/trpc'
import { useCurrentSite } from '@/contexts/CurrentSiteContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'

export function StockSettings() {
  const { t } = useTranslation()
  const { currentSite } = useCurrentSite()
  const [itemSheetOpen, setItemSheetOpen] = useState(false)
  const [locationSheetOpen, setLocationSheetOpen] = useState(false)
  const [newItemName, setNewItemName] = useState('')
  const [newItemUnit, setNewItemUnit] = useState('')
  const [newLocationName, setNewLocationName] = useState('')

  const { data: items, refetch: refetchItems } = trpc.stock.items.list.useQuery(
    { siteId: currentSite?.id ?? '' },
    { enabled: !!currentSite }
  )
  const { data: locations, refetch: refetchLocations } = trpc.stock.locations.list.useQuery(
    { siteId: currentSite?.id ?? '' },
    { enabled: !!currentSite }
  )

  const createItem = trpc.stock.items.create.useMutation()
  const createLocation = trpc.stock.locations.create.useMutation()

  const handleCreateItem = async () => {
    if (!currentSite || !newItemName || !newItemUnit) return
    await createItem.mutateAsync({ siteId: currentSite.id, name: newItemName, unit: newItemUnit })
    await refetchItems()
    setItemSheetOpen(false)
    setNewItemName('')
    setNewItemUnit('')
  }

  const handleCreateLocation = async () => {
    if (!currentSite || !newLocationName) return
    await createLocation.mutateAsync({ siteId: currentSite.id, name: newLocationName })
    await refetchLocations()
    setLocationSheetOpen(false)
    setNewLocationName('')
  }

  if (!currentSite) return null

  return (
    <div className="container mx-auto px-4 py-6 max-w-lg">
      <h1 className="text-2xl font-bold mb-4">{t('stock.settings')}</h1>

      <Tabs defaultValue="items">
        <TabsList className="w-full">
          <TabsTrigger value="items" className="flex-1">{t('stock.items')}</TabsTrigger>
          <TabsTrigger value="locations" className="flex-1">{t('stock.locations')}</TabsTrigger>
        </TabsList>

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
                  <p className="text-xs text-muted-foreground">{item.unit}</p>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

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
        <SheetContent side="bottom" className="h-[50vh] flex flex-col gap-4">
          <SheetHeader><SheetTitle>{t('stock.actions.newItem')}</SheetTitle></SheetHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('stock.item.name')}</Label>
              <Input value={newItemName} onChange={(e) => setNewItemName(e.target.value)} placeholder={t('stock.item.namePlaceholder')} />
            </div>
            <div>
              <Label>{t('stock.item.unit')}</Label>
              <Input value={newItemUnit} onChange={(e) => setNewItemUnit(e.target.value)} placeholder={t('stock.item.unitPlaceholder')} />
            </div>
            <Button onClick={handleCreateItem} disabled={!newItemName || !newItemUnit || createItem.isPending} className="w-full">
              {createItem.isPending ? t('stock.common.saving') : t('stock.common.addItem')}
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
              <Input value={newLocationName} onChange={(e) => setNewLocationName(e.target.value)} placeholder={t('stock.location.namePlaceholder')} />
            </div>
            <Button onClick={handleCreateLocation} disabled={!newLocationName || createLocation.isPending} className="w-full">
              {createLocation.isPending ? t('stock.common.saving') : t('stock.common.addLocation')}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
