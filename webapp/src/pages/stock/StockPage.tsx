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
        <Button variant="ghost" size="icon" onClick={() => navigate('/stock/settings')}>
          <Settings2 className="h-5 w-5" />
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

      {/* Stock levels table */}
      <div>
        <h2 className="text-base font-semibold mb-3 text-muted-foreground">
          {t('stock.levels')}
        </h2>

        {levelsLoading ? (
          <p className="text-sm text-muted-foreground">{t('stock.common.loading')}</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('stock.common.noItemsYet')}</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="text-start py-2 px-3 font-medium text-muted-foreground">
                    {t('stock.item.name')}
                  </th>
                  {locations.map((loc) => (
                    <th key={loc.id} className="py-2 px-3 font-medium text-center whitespace-nowrap">
                      {loc.name}
                    </th>
                  ))}
                  <th className="py-2 px-3 font-medium text-center text-muted-foreground">Σ</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-3">
                      <p className="font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.unit}</p>
                    </td>
                    {locations.map((loc) => {
                      const qty = balances[item.id]?.[loc.id] ?? 0
                      return (
                        <td
                          key={loc.id}
                          className={`py-3 px-3 text-center font-semibold tabular-nums ${
                            qty === 0 ? 'text-muted-foreground/40' : ''
                          }`}
                        >
                          {qty}
                        </td>
                      )
                    })}
                    <td className="py-3 px-3 text-center font-semibold tabular-nums text-muted-foreground">
                      {totals[item.id]}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
