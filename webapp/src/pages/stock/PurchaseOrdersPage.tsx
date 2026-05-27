import { useState } from 'react'
import { useTranslation } from 'react-i18next'
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
import type { inferRouterInputs } from '@trpc/server'
import type { AppRouter } from '../../../../server/src/routers/appRouter'

type RouterInput = inferRouterInputs<AppRouter>
type CreateOrderInput = RouterInput['stock']['purchaseOrders']['create']

const statusColors: Record<string, string> = {
  OPEN: 'bg-blue-500/20 text-blue-600',
  PARTIAL: 'bg-amber-500/20 text-amber-600',
  COMPLETE: 'bg-green-500/20 text-green-600',
  CANCELLED: 'bg-muted text-muted-foreground',
}

export function PurchaseOrdersPage() {
  const { t } = useTranslation()
  const { currentSite } = useCurrentSite()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [form, setForm] = useState<Partial<CreateOrderInput>>({})

  const { data: orders, refetch } = trpc.stock.purchaseOrders.list.useQuery(
    { siteId: currentSite?.id ?? '' },
    { enabled: !!currentSite }
  )
  const { data: items } = trpc.stock.items.list.useQuery(
    { siteId: currentSite?.id ?? '' },
    { enabled: !!currentSite && sheetOpen }
  )

  const createOrder = trpc.stock.purchaseOrders.create.useMutation()

  const handleCreate = async () => {
    if (!currentSite || !form.itemId || !form.orderedQuantity || !form.orderDate) return
    await createOrder.mutateAsync({
      siteId: currentSite.id,
      itemId: form.itemId,
      orderedQuantity: Number(form.orderedQuantity),
      supplierName: form.supplierName,
      orderDate: new Date(form.orderDate).toISOString(),
    })
    await refetch()
    setSheetOpen(false)
    setForm({})
  }

  if (!currentSite) return null

  return (
    <div className="container mx-auto px-4 py-6 max-w-lg">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">{t('stock.orders')}</h1>
        <Button size="sm" onClick={() => setSheetOpen(true)}>
          + {t('stock.actions.newOrder')}
        </Button>
      </div>

      <div className="space-y-3">
        {orders?.map((order) => {
          const received = order.arrivals.reduce((s, a) => s + a.quantity, 0)
          return (
            <div key={order.id} className="border rounded-lg p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{order.item.name}</p>
                  {order.supplierName && (
                    <p className="text-xs text-muted-foreground">{order.supplierName}</p>
                  )}
                  <p className="text-sm text-muted-foreground mt-1">
                    {t('stock.order.summary', { ordered: order.orderedQuantity, received })}
                  </p>
                </div>
                <Badge className={statusColors[order.status]}>
                  {t(`stock.order.status.${order.status}`)}
                </Badge>
              </div>
            </div>
          )
        })}
        {orders?.length === 0 && (
          <p className="text-muted-foreground text-sm">{t('stock.order.empty')}</p>
        )}
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="h-[70vh] overflow-y-auto flex flex-col gap-4">
          <SheetHeader>
            <SheetTitle>{t('stock.actions.newOrder')}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('stock.item.name')}</Label>
              <Select onValueChange={(v) => setForm((f) => ({ ...f, itemId: v }))}>
                <SelectTrigger><SelectValue placeholder={t('stock.common.selectItem')} /></SelectTrigger>
                <SelectContent>
                  {items?.map((item) => (
                    <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('stock.order.orderedQuantity')}</Label>
              <Input
                type="number"
                placeholder={t('stock.order.quantityPlaceholder')}
                onChange={(e) => setForm((f) => ({ ...f, orderedQuantity: Number(e.target.value) }))}
              />
            </div>
            <div>
              <Label>{t('stock.order.supplier')}</Label>
              <Input
                placeholder={t('stock.order.supplierPlaceholder')}
                onChange={(e) => setForm((f) => ({ ...f, supplierName: e.target.value }))}
              />
            </div>
            <div>
              <Label>{t('stock.order.orderDate')}</Label>
              <Input
                type="date"
                onChange={(e) => setForm((f) => ({ ...f, orderDate: e.target.value }))}
              />
            </div>
            <Button
              onClick={handleCreate}
              disabled={createOrder.isPending || !form.itemId || !form.orderedQuantity || !form.orderDate}
              className="w-full"
            >
              {createOrder.isPending ? t('stock.common.saving') : t('stock.common.createOrder')}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
