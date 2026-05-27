import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { trpc } from '@/utils/trpc'
import { StockStepper } from './StockStepper'
import { ItemListSheet } from './ItemListSheet'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface RecountFlowProps {
  siteId: string
  onClose: () => void
}

type CountedMap = Record<string, number> // itemId → counted quantity

export function RecountFlow({ siteId, onClose }: RecountFlowProps) {
  const { t } = useTranslation()
  const [locationId, setLocationId] = useState<string | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [counted, setCounted] = useState<CountedMap>({})
  const [listOpen, setListOpen] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const { data: locations } = trpc.stock.locations.list.useQuery({ siteId })
  const { data: levelsByLocation } = trpc.stock.levels.getByLocation.useQuery(
    { locationId: locationId ?? '' },
    { enabled: !!locationId }
  )

  const createRecount = trpc.stock.recounts.create.useMutation()
  const utils = trpc.useUtils()

  const items = levelsByLocation ?? []
  const selectedLocation = locations?.find((l) => l.id === locationId)
  const currentItem = items[currentIndex]

  const handleCount = (value: number) => {
    if (!currentItem) return
    setCounted((prev) => ({ ...prev, [currentItem.item.id]: value }))
  }

  const handleNext = () => {
    if (currentIndex < items.length - 1) setCurrentIndex((i) => i + 1)
  }

  const handleBack = () => {
    if (currentIndex > 0) setCurrentIndex((i) => i - 1)
  }

  const handleJump = (itemId: string) => {
    const idx = items.findIndex((e) => e.item.id === itemId)
    if (idx >= 0) setCurrentIndex(idx)
  }

  const handleSubmit = async () => {
    if (!locationId) return
    const now = new Date().toISOString()
    await Promise.all(
      Object.entries(counted).map(([itemId, countedQuantity]) =>
        createRecount.mutateAsync({
          siteId,
          itemId,
          locationId,
          countedQuantity,
          countedAt: now,
        })
      )
    )
    await utils.stock.levels.list.invalidate({ siteId })
    setSubmitted(true)
  }

  const doneCount = Object.keys(counted).length
  const allDone = doneCount === items.length && items.length > 0

  // Step 1: location selection
  if (!locationId) {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('stock.actions.recount')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-3">{t('stock.location.name')}</p>
          <Select onValueChange={setLocationId}>
            <SelectTrigger>
              <SelectValue placeholder="Select location…" />
            </SelectTrigger>
            <SelectContent>
              {locations?.map((loc) => (
                <SelectItem key={loc.id} value={loc.id}>
                  {loc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </DialogContent>
      </Dialog>
    )
  }

  // Step 3: done confirmation
  if (submitted) {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-w-sm text-center">
          <DialogHeader>
            <DialogTitle>{t('stock.common.recountSaved')} ✓</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-4">
            {doneCount} item{doneCount !== 1 ? 's' : ''} updated at {selectedLocation?.name}.
          </p>
          <Button onClick={onClose}>{t('stock.common.done')}</Button>
        </DialogContent>
      </Dialog>
    )
  }

  // Step 2: item-by-item counting
  if (!currentItem) {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-w-sm">
          <p className="text-muted-foreground text-sm">{t('stock.common.noItemsAtLocation')}</p>
          <Button variant="outline" onClick={onClose} className="mt-4">{t('stock.common.close')}</Button>
        </DialogContent>
      </Dialog>
    )
  }

  const expectedBalance = currentItem.balance
  const currentCounted = counted[currentItem.item.id] ?? 0
  const delta = currentCounted - expectedBalance

  return (
    <>
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-w-sm flex flex-col gap-0 p-0 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <span className="text-xs text-muted-foreground">📍 {selectedLocation?.name}</span>
            <button
              className="text-xs font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary"
              onClick={() => setListOpen(true)}
            >
              {doneCount} / {items.length} {t('stock.items').toLowerCase()} ▾
            </button>
          </div>

          {/* Progress bar */}
          <div className="h-1 bg-muted mx-4 rounded-full mb-4">
            <div
              className="h-1 bg-primary rounded-full transition-all"
              style={{ width: `${(doneCount / items.length) * 100}%` }}
            />
          </div>

          {/* Item info */}
          <div className="text-center px-4 mb-2">
            <p className="text-xl font-bold">{currentItem.item.name}</p>
            <p className="text-sm text-muted-foreground">
              {t('stock.recount.expected')}: <span className="font-semibold text-amber-500">{expectedBalance}</span> {currentItem.item.unit}
            </p>
          </div>

          {/* Stepper */}
          <div className="px-4 py-2">
            <StockStepper
              value={currentCounted}
              onChange={handleCount}
              sublabel={t('stock.recount.counted').toLowerCase()}
            />
          </div>

          {/* Delta */}
          <div className="mx-4 mb-4 px-3 py-2 bg-muted rounded-lg text-center text-sm">
            {delta === 0 ? (
              <span className="text-muted-foreground">{t('stock.common.noChange')}</span>
            ) : (
              <span className={delta < 0 ? 'text-destructive font-semibold' : 'text-green-600 font-semibold'}>
                {delta > 0 ? '+' : ''}{delta} {t('stock.common.vsExpected')}
              </span>
            )}
          </div>

          {/* Navigation */}
          <div className="flex gap-2 px-4 pb-4">
            <Button variant="outline" size="sm" onClick={handleBack} disabled={currentIndex === 0}>
              ← {t('stock.common.back')}
            </Button>
            <Button variant="outline" size="sm" onClick={handleNext} disabled={currentIndex === items.length - 1} className="flex-1">
              {t('stock.common.skip')}
            </Button>
            {currentIndex < items.length - 1 ? (
              <Button size="sm" onClick={handleNext} className="flex-1">
                {t('stock.common.next')} →
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={doneCount === 0 || createRecount.isPending}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {createRecount.isPending ? t('stock.common.saving') : t('stock.common.submit')}
              </Button>
            )}
          </div>

          {/* Early submit */}
          {!allDone && doneCount > 0 && (
            <div className="px-4 pb-3 text-center">
              <button
                className="text-xs text-muted-foreground underline"
                onClick={handleSubmit}
                disabled={createRecount.isPending}
              >
                Submit {doneCount} counted item{doneCount !== 1 ? 's' : ''} now
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ItemListSheet
        open={listOpen}
        onOpenChange={setListOpen}
        locationName={selectedLocation?.name ?? ''}
        items={items.map((entry, idx) => ({
          itemId: entry.item.id,
          itemName: entry.item.name,
          unit: entry.item.unit,
          expectedBalance: entry.balance,
          counted: counted[entry.item.id],
          isCurrent: idx === currentIndex,
        }))}
        onSelectItem={handleJump}
      />
    </>
  )
}
