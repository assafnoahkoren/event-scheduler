import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowRight } from 'lucide-react'
import { trpc } from '@/utils/trpc'
import { StockStepper } from './StockStepper'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface MoveStockSheetProps {
  siteId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function MoveStockSheet({ siteId, open, onOpenChange }: MoveStockSheetProps) {
  const { t } = useTranslation()
  const [itemId, setItemId] = useState<string | null>(null)
  const [fromLocationId, setFromLocationId] = useState<string | null>(null)
  const [toLocationId, setToLocationId] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(0)

  const { data: items } = trpc.stock.items.list.useQuery({ siteId }, { enabled: open })
  const { data: levels } = trpc.stock.levels.list.useQuery({ siteId }, { enabled: open })

  const locations = levels?.locations ?? []

  const fromBalance =
    itemId && fromLocationId
      ? (levels?.balances[itemId]?.[fromLocationId] ?? 0)
      : null

  const toBalance =
    itemId && toLocationId
      ? (levels?.balances[itemId]?.[toLocationId] ?? 0)
      : null

  const createMovement = trpc.stock.movements.create.useMutation()
  const utils = trpc.useUtils()

  const handleConfirm = async () => {
    if (!itemId || !fromLocationId || !toLocationId || quantity <= 0) return
    await createMovement.mutateAsync({
      siteId,
      itemId,
      fromLocationId,
      toLocationId,
      quantity,
      movedAt: new Date().toISOString(),
    })
    await utils.stock.levels.list.invalidate({ siteId })
    onOpenChange(false)
    setItemId(null)
    setFromLocationId(null)
    setToLocationId(null)
    setQuantity(0)
  }

  const afterFrom = fromBalance !== null ? fromBalance - quantity : null
  const afterTo = toBalance !== null ? toBalance + quantity : null
  const insufficientStock = fromBalance !== null && quantity > fromBalance

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] flex flex-col gap-4 overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t('stock.actions.moveStock')}</SheetTitle>
        </SheetHeader>

        {/* Item */}
        <div>
          <p className="text-sm font-medium mb-2">{t('stock.item.name')}</p>
          <Select onValueChange={setItemId}>
            <SelectTrigger>
              <SelectValue placeholder="Select item…" />
            </SelectTrigger>
            <SelectContent>
              {items?.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* From / To */}
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <p className="text-sm font-medium mb-2">{t('stock.movement.from')}</p>
            <Select onValueChange={setFromLocationId}>
              <SelectTrigger>
                <SelectValue placeholder="From…" />
              </SelectTrigger>
              <SelectContent>
                {locations
                  .filter((l) => l.id !== toLocationId)
                  .map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name}
                      {itemId && ` (${levels?.balances[itemId]?.[loc.id] ?? 0})`}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground mt-5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium mb-2">{t('stock.movement.to')}</p>
            <Select onValueChange={setToLocationId}>
              <SelectTrigger>
                <SelectValue placeholder="To…" />
              </SelectTrigger>
              <SelectContent>
                {locations
                  .filter((l) => l.id !== fromLocationId)
                  .map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Stepper */}
        {fromBalance !== null && (
          <StockStepper
            value={quantity}
            onChange={setQuantity}
            max={fromBalance}
            sublabel={t('stock.movement.quantity').toLowerCase()}
          />
        )}

        {/* After-state preview */}
        {quantity > 0 && fromBalance !== null && toBalance !== null && (
          <div className={`flex justify-around text-sm px-3 py-2 rounded-lg ${
            insufficientStock ? 'bg-destructive/10 text-destructive' : 'bg-muted'
          }`}>
            {insufficientStock ? (
              <span>Not enough stock at source ({fromBalance} available)</span>
            ) : (
              <>
                <span>{locations.find(l => l.id === fromLocationId)?.name}: <b>{afterFrom}</b></span>
                <span>{locations.find(l => l.id === toLocationId)?.name}: <b>{afterTo}</b></span>
              </>
            )}
          </div>
        )}

        <Button
          onClick={handleConfirm}
          disabled={
            !itemId || !fromLocationId || !toLocationId ||
            quantity <= 0 || insufficientStock || createMovement.isPending
          }
          className="bg-amber-500 hover:bg-amber-600 text-white"
        >
          {createMovement.isPending ? t('stock.common.saving') : t('stock.common.logMovement')}
        </Button>
      </SheetContent>
    </Sheet>
  )
}
