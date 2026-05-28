import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Trash2, ChevronRight } from 'lucide-react'
import { trpc } from '@/utils/trpc'
import { useCurrentSite } from '@/contexts/CurrentSiteContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { RecordArrivalSheet } from '@/components/stock/RecordArrivalSheet'
import type { inferRouterInputs } from '@trpc/server'
import type { AppRouter } from '../../../../server/src/routers/appRouter'

type RouterInput = inferRouterInputs<AppRouter>
type CreateOrderInput = RouterInput['stock']['purchaseOrders']['create']
type OrderLine = CreateOrderInput['lines'][number]

const statusColors: Record<string, string> = {
  OPEN: 'bg-blue-500/20 text-blue-600',
  PARTIAL: 'bg-amber-500/20 text-amber-600',
  COMPLETE: 'bg-green-500/20 text-green-600',
  CANCELLED: 'bg-muted text-muted-foreground',
}

export function PurchaseOrdersPage() {
  const { t } = useTranslation()
  const { currentSite } = useCurrentSite()
  const [createSheetOpen, setCreateSheetOpen] = useState(false)
  const [arrivalOrderId, setArrivalOrderId] = useState<string | null>(null)
  const [supplierName, setSupplierName] = useState('')
  const [orderDate, setOrderDate] = useState('')
  const [lines, setLines] = useState<Partial<OrderLine>[]>([{}])

  const { data: orders, refetch } = trpc.stock.purchaseOrders.list.useQuery(
    { siteId: currentSite?.id ?? '' },
    { enabled: !!currentSite }
  )
  const { data: items } = trpc.stock.items.list.useQuery(
    { siteId: currentSite?.id ?? '' },
    { enabled: !!currentSite && createSheetOpen }
  )

  const createOrder = trpc.stock.purchaseOrders.create.useMutation()

  const addLine = () => setLines((prev) => [...prev, {}])
  const removeLine = (idx: number) => setLines((prev) => prev.filter((_, i) => i !== idx))
  const updateLine = (idx: number, patch: Partial<OrderLine>) =>
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)))

  const linesValid =
    lines.length > 0 &&
    lines.every((l) => l.itemId && l.orderedQuantity && l.orderedQuantity > 0)

  const handleCreate = async () => {
    if (!currentSite || !orderDate || !linesValid) return
    await createOrder.mutateAsync({
      siteId: currentSite.id,
      supplierName: supplierName || undefined,
      orderDate: new Date(orderDate).toISOString(),
      lines: lines as OrderLine[],
    })
    await refetch()
    setCreateSheetOpen(false)
    setSupplierName('')
    setOrderDate('')
    setLines([{}])
  }

  const canReceive = (status: string) => status === 'OPEN' || status === 'PARTIAL'

  if (!currentSite) return null

  return (
    <div className="container mx-auto px-4 py-6 max-w-lg">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">{t('stock.orders')}</h1>
        <Button size="sm" onClick={() => setCreateSheetOpen(true)}>
          + {t('stock.actions.newOrder')}
        </Button>
      </div>

      <div className="space-y-3">
        {orders?.map((order) => {
          const totalOrdered = order.orderLines.reduce((s, l) => s + l.orderedQuantity, 0)
          const totalReceived = order.orderLines.reduce(
            (s, l) => s + l.arrivals.reduce((a, arr) => a + arr.quantity, 0),
            0
          )
          const receivable = canReceive(order.status)

          return (
            <div
              key={order.id}
              className={cn(
                'border rounded-lg p-4 transition-colors',
                receivable
                  ? 'cursor-pointer hover:bg-muted/40 active:bg-muted/60'
                  : 'opacity-60'
              )}
              onClick={() => receivable && setArrivalOrderId(order.id)}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  {order.supplierName && (
                    <p className="font-semibold">{order.supplierName}</p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    {t('stock.order.summary', { ordered: totalOrdered, received: totalReceived })}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge className={statusColors[order.status]}>
                    {t(`stock.order.status.${order.status}`)}
                  </Badge>
                  {receivable && (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </div>

              {/* Lines breakdown */}
              <div className="space-y-1 border-t pt-2">
                {order.orderLines.map((line) => {
                  const received = line.arrivals.reduce((s, a) => s + a.quantity, 0)
                  const isDone = line.status === 'COMPLETE'
                  return (
                    <div
                      key={line.id}
                      className={cn(
                        'flex items-center justify-between text-sm',
                        isDone && 'opacity-40'
                      )}
                    >
                      <span className="text-muted-foreground">{line.item.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="tabular-nums">
                          {received} / {line.orderedQuantity} {line.item.unit}
                        </span>
                        <Badge className={`text-xs ${statusColors[line.status]}`}>
                          {t(`stock.order.status.${line.status}`)}
                        </Badge>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
        {orders?.length === 0 && (
          <p className="text-muted-foreground text-sm">{t('stock.order.empty')}</p>
        )}
      </div>

      {/* Create order sheet */}
      <Sheet open={createSheetOpen} onOpenChange={setCreateSheetOpen}>
        <SheetContent side="bottom" className="h-[85vh] overflow-y-auto flex flex-col gap-4">
          <SheetHeader>
            <SheetTitle>{t('stock.actions.newOrder')}</SheetTitle>
          </SheetHeader>

          <div className="space-y-4">
            <div>
              <Label>{t('stock.order.supplier')}</Label>
              <Input
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                placeholder={t('stock.order.supplierPlaceholder')}
              />
            </div>
            <div>
              <Label>{t('stock.order.orderDate')}</Label>
              <Input
                type="date"
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
              />
            </div>

            <div>
              <Label>{t('stock.order.lines')}</Label>
              <div className="space-y-2 mt-1">
                {lines.map((line, idx) => (
                  <div key={idx} className="flex gap-2 items-start">
                    <div className="flex-1">
                      <Select
                        value={line.itemId ?? ''}
                        onValueChange={(v) => updateLine(idx, { itemId: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t('stock.common.selectItem')} />
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
                    <Input
                      type="number"
                      className="w-24 shrink-0"
                      placeholder={t('stock.order.quantityPlaceholder')}
                      value={line.orderedQuantity ?? ''}
                      onChange={(e) =>
                        updateLine(idx, { orderedQuantity: Number(e.target.value) })
                      }
                    />
                    {lines.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0 text-destructive hover:text-destructive"
                        onClick={() => removeLine(idx)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-2 w-full"
                onClick={addLine}
              >
                <Plus className="h-4 w-4 me-1" />
                {t('stock.order.addLine')}
              </Button>
            </div>

            <Button
              onClick={handleCreate}
              disabled={createOrder.isPending || !orderDate || !linesValid}
              className="w-full"
            >
              {createOrder.isPending ? t('stock.common.saving') : t('stock.common.createOrder')}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Arrival sheet — scoped to the tapped order */}
      <RecordArrivalSheet
        siteId={currentSite.id}
        open={arrivalOrderId !== null}
        onOpenChange={(open) => { if (!open) setArrivalOrderId(null) }}
        orderId={arrivalOrderId ?? undefined}
      />
    </div>
  )
}
