import { useState } from 'react'
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
}

export function RecordArrivalSheet({ siteId, open, onOpenChange }: RecordArrivalSheetProps) {
  const { t } = useTranslation()
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [locationId, setLocationId] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(0)

  const { data: orders } = trpc.stock.purchaseOrders.list.useQuery(
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

  const selectedOrder = [...(orders ?? []), ...(partialOrders ?? [])].find(
    (o) => o.id === selectedOrderId
  )

  const alreadyReceived = selectedOrder?.arrivals.reduce((s, a) => s + a.quantity, 0) ?? 0
  const remaining = selectedOrder ? selectedOrder.orderedQuantity - alreadyReceived : 0

  const createArrival = trpc.stock.arrivals.create.useMutation()
  const utils = trpc.useUtils()

  const allOrders = [...(orders ?? []), ...(partialOrders ?? [])]

  const handleConfirm = async () => {
    if (!selectedOrderId || !locationId || quantity <= 0) return
    await createArrival.mutateAsync({
      purchaseOrderId: selectedOrderId,
      locationId,
      quantity,
      arrivedAt: new Date().toISOString(),
    })
    await utils.stock.purchaseOrders.list.invalidate({ siteId })
    await utils.stock.levels.list.invalidate({ siteId })
    onOpenChange(false)
    setSelectedOrderId(null)
    setLocationId(null)
    setQuantity(0)
  }

  const newStatus =
    selectedOrder && quantity > 0
      ? alreadyReceived + quantity >= selectedOrder.orderedQuantity
        ? 'COMPLETE'
        : 'PARTIAL'
      : null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[80vh] flex flex-col gap-4 overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t('stock.actions.recordArrival')}</SheetTitle>
        </SheetHeader>

        {/* Order selector */}
        <div>
          <p className="text-sm font-medium mb-2">{t('stock.orders')}</p>
          <Select onValueChange={setSelectedOrderId}>
            <SelectTrigger>
              <SelectValue placeholder="Select purchase order…" />
            </SelectTrigger>
            <SelectContent>
              {allOrders.map((order) => (
                <SelectItem key={order.id} value={order.id}>
                  {order.item.name} — {order.orderedQuantity} {order.item.unit} ({order.status})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedOrder && (
          <>
            <div className="bg-muted rounded-lg p-3 text-sm">
              <p className="font-medium">{selectedOrder.item.name}</p>
              {selectedOrder.supplierName && (
                <p className="text-muted-foreground">Supplier: {selectedOrder.supplierName}</p>
              )}
              <p className="text-muted-foreground">
                Ordered: {selectedOrder.orderedQuantity} · Received: {alreadyReceived} · Outstanding: {remaining}
              </p>
            </div>

            {/* Location selector */}
            <div>
              <p className="text-sm font-medium mb-2">{t('stock.arrival.placedAt')}</p>
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
            </div>

            {/* Stepper */}
            <StockStepper
              value={quantity}
              onChange={setQuantity}
              max={remaining}
              sublabel={t('stock.arrival.quantity').toLowerCase()}
            />

            {/* Status preview */}
            {quantity > 0 && newStatus && (
              <div className={`text-sm text-center px-3 py-2 rounded-lg ${
                newStatus === 'COMPLETE' ? 'bg-green-500/10 text-green-600' : 'bg-amber-500/10 text-amber-600'
              }`}>
                {remaining - quantity > 0
                  ? `⚠ ${remaining - quantity} still outstanding → order stays PARTIAL`
                  : '✓ Order will be marked COMPLETE'}
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
