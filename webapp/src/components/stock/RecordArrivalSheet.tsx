import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
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

interface RecordArrivalSheetProps {
  siteId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  /** When provided, scopes the sheet to lines from this order only. */
  orderId?: string
}

export function RecordArrivalSheet({ siteId, open, onOpenChange, orderId }: RecordArrivalSheetProps) {
  const { t } = useTranslation()
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null)
  const [locationId, setLocationId] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(0)

  const { data: openOrders } = trpc.stock.purchaseOrders.list.useQuery(
    { siteId, status: 'OPEN' },
    { enabled: open }
  )
  const { data: partialOrders } = trpc.stock.purchaseOrders.list.useQuery(
    { siteId, status: 'PARTIAL' },
    { enabled: open }
  )
  const { data: locations } = trpc.stock.locations.list.useQuery(
    { siteId },
    { enabled: open }
  )

  // All outstanding lines across receivable orders
  const allLines = [...(openOrders ?? []), ...(partialOrders ?? [])].flatMap((order) =>
    order.orderLines
      .filter((l) => l.status !== 'COMPLETE')
      .map((line) => ({ ...line, order }))
  )

  // Scope to a specific order if orderId is provided
  const scopedLines = orderId ? allLines.filter((l) => l.order.id === orderId) : allLines

  // Auto-select the only line when there's exactly one outstanding in this order
  useEffect(() => {
    if (open && scopedLines.length === 1) {
      setSelectedLineId(scopedLines[0].id)
    }
  }, [open, scopedLines.length])

  // Reset all state when the sheet closes
  useEffect(() => {
    if (!open) {
      setSelectedLineId(null)
      setLocationId(null)
      setQuantity(0)
    }
  }, [open])

  const selectedLine = scopedLines.find((l) => l.id === selectedLineId) ?? null
  const alreadyReceived = selectedLine?.arrivals.reduce((s, a) => s + a.quantity, 0) ?? 0
  const remaining = selectedLine ? selectedLine.orderedQuantity - alreadyReceived : 0

  const createArrival = trpc.stock.arrivals.create.useMutation()
  const utils = trpc.useUtils()

  const handleConfirm = async () => {
    if (!selectedLineId || !locationId || quantity <= 0) return
    await createArrival.mutateAsync({
      purchaseOrderLineId: selectedLineId,
      locationId,
      quantity,
      arrivedAt: new Date().toISOString(),
    })
    await utils.stock.purchaseOrders.list.invalidate({ siteId })
    await utils.stock.levels.list.invalidate({ siteId })
    onOpenChange(false)
  }

  const newLineStatus =
    selectedLine && quantity > 0
      ? alreadyReceived + quantity >= selectedLine.orderedQuantity
        ? 'COMPLETE'
        : 'PARTIAL'
      : null

  // Determine sheet title: when scoped, show the supplier name or generic title
  const scopedOrder = orderId
    ? [...(openOrders ?? []), ...(partialOrders ?? [])].find((o) => o.id === orderId)
    : null
  const sheetTitle = scopedOrder?.supplierName ?? t('stock.actions.recordArrival')

  const showLinePicker = scopedLines.length > 1 || !orderId

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[80vh] flex flex-col gap-4 overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{sheetTitle}</SheetTitle>
        </SheetHeader>

        {/* Line picker — shown only when multiple outstanding lines or not order-scoped */}
        {showLinePicker && (
          <div>
            <p className="text-sm font-medium mb-2">{t('stock.arrival.selectLine')}</p>
            <Select value={selectedLineId ?? ''} onValueChange={setSelectedLineId}>
              <SelectTrigger>
                <SelectValue placeholder={t('stock.arrival.selectLinePlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {scopedLines.map((line) => {
                  const received = line.arrivals.reduce((s, a) => s + a.quantity, 0)
                  const outstanding = line.orderedQuantity - received
                  const orderLabel = line.order.supplierName ? `${line.order.supplierName} — ` : ''
                  return (
                    <SelectItem key={line.id} value={line.id}>
                      {orderLabel}{line.item.name}
                      {' '}({t('stock.arrival.outstanding', { count: outstanding, unit: line.item.unit })})
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>
        )}

        {selectedLine && (
          <>
            {/* Summary card */}
            <div className="bg-muted rounded-lg p-3 text-sm">
              <p className="font-medium">{selectedLine.item.name}</p>
              {selectedLine.order.supplierName && !scopedOrder && (
                <p className="text-muted-foreground">
                  {t('stock.order.supplierLabel', { name: selectedLine.order.supplierName })}
                </p>
              )}
              <p className="text-muted-foreground">
                {t('stock.arrival.orderSummary', {
                  ordered: selectedLine.orderedQuantity,
                  received: alreadyReceived,
                  outstanding: remaining,
                })}
              </p>
            </div>

            {/* Location selector */}
            <div>
              <p className="text-sm font-medium mb-2">{t('stock.arrival.placedAt')}</p>
              <Select value={locationId ?? ''} onValueChange={setLocationId}>
                <SelectTrigger>
                  <SelectValue placeholder={t('stock.common.selectLocation')} />
                </SelectTrigger>
                <SelectContent>
                  {locations?.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Stepper */}
            <StockStepper
              value={quantity}
              onChange={setQuantity}
              max={remaining}
              sublabel={t('stock.arrival.quantity').toLowerCase()}
            />

            {/* Status preview */}
            {quantity > 0 && newLineStatus && (
              <div className={`text-sm text-center px-3 py-2 rounded-lg ${
                newLineStatus === 'COMPLETE'
                  ? 'bg-green-500/10 text-green-600'
                  : 'bg-amber-500/10 text-amber-600'
              }`}>
                {remaining - quantity > 0
                  ? t('stock.arrival.staysPartial', { count: remaining - quantity })
                  : t('stock.arrival.markedComplete')}
              </div>
            )}

            <Button
              onClick={handleConfirm}
              disabled={!locationId || quantity <= 0 || createArrival.isPending}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {createArrival.isPending ? t('stock.common.saving') : t('stock.common.confirmArrival')}
            </Button>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
