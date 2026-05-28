import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Warehouse, ArrowRightLeft, ClipboardList, ShoppingCart, Settings2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MoveStockSheet } from '@/components/stock/MoveStockSheet'
import { RecountFlow } from '@/components/stock/RecountFlow'
import { useCurrentSite } from '@/contexts/CurrentSiteContext'
import { trpc } from '@/utils/trpc'

export function StockPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { currentSite } = useCurrentSite()
  const [moveOpen, setMoveOpen] = useState(false)
  const [recountOpen, setRecountOpen] = useState(false)

  const { data: levels, isLoading: levelsLoading } = trpc.stock.levels.list.useQuery(
    { siteId: currentSite?.id ?? '' },
    { enabled: !!currentSite }
  )

  if (!currentSite) return null

  const { items = [], locations = [], balances = {} } = levels ?? {}

  const totals = Object.fromEntries(
    items.map((item) => [
      item.id,
      locations.reduce((sum, loc) => sum + (balances[item.id]?.[loc.id] ?? 0), 0),
    ])
  )

  const primaryActions = [
    {
      label: t('stock.orders'),
      icon: ShoppingCart,
      color: 'bg-green-600 hover:bg-green-700',
      onClick: () => navigate('/stock/orders'),
    },
    {
      label: t('stock.actions.moveStock'),
      icon: ArrowRightLeft,
      color: 'bg-amber-500 hover:bg-amber-600',
      onClick: () => setMoveOpen(true),
    },
    {
      label: t('stock.actions.recount'),
      icon: ClipboardList,
      color: 'bg-blue-500 hover:bg-blue-600',
      onClick: () => setRecountOpen(true),
    },
  ]

  return (
    <div className="container mx-auto px-4 py-6 max-w-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Warehouse className="h-6 w-6" />
          <h1 className="text-2xl font-bold">{t('stock.title')}</h1>
        </div>
        <Button variant="ghost" size="sm" onClick={() => navigate('/stock/settings')}>
          <Settings2 className="h-4 w-4" />
          {t('stock.settings')}
        </Button>
      </div>

      {/* Primary actions */}
      <div className="grid gap-3 mb-8">
        {primaryActions.map((action) => (
          <button
            key={action.label}
            onClick={action.onClick}
            className={`flex items-center gap-4 p-5 rounded-xl text-white font-semibold text-lg text-start w-full transition-colors ${action.color}`}
          >
            <action.icon className="h-7 w-7 shrink-0" />
            {action.label}
          </button>
        ))}
      </div>

      {/* Stock levels */}
      <div>
        <h2 className="text-base font-semibold mb-3 text-muted-foreground">
          {t('stock.levels')}
        </h2>

        {levelsLoading ? (
          <p className="text-sm text-muted-foreground">{t('stock.common.loading')}</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('stock.common.noItemsYet')}</p>
        ) : (
          <div className="flex flex-col gap-3">
            {items.map((item) => (
              <div key={item.id} className="rounded-xl border bg-card p-3">
                <div className="flex items-baseline justify-between mb-2">
                  <p className="font-semibold text-base">{item.name}</p>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {totals[item.id]} {item.unit}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {locations.map((loc) => {
                    const qty = balances[item.id]?.[loc.id] ?? 0
                    return (
                      <div
                        key={loc.id}
                        className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 text-sm ${
                          qty === 0
                            ? 'bg-muted/40 text-muted-foreground/50'
                            : 'bg-muted'
                        }`}
                      >
                        <span className="truncate me-1">{loc.name}</span>
                        <span className={`font-semibold tabular-nums shrink-0 ${
                          qty === 0 ? '' : qty <= 3 ? 'text-amber-500' : 'text-foreground'
                        }`}>
                          {qty}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <MoveStockSheet siteId={currentSite.id} open={moveOpen} onOpenChange={setMoveOpen} />
      {recountOpen && (
        <RecountFlow siteId={currentSite.id} onClose={() => setRecountOpen(false)} />
      )}
    </div>
  )
}
