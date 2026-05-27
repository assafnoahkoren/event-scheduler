import { useTranslation } from 'react-i18next'
import { trpc } from '@/utils/trpc'
import { useCurrentSite } from '@/contexts/CurrentSiteContext'

export function StockLevels() {
  const { t } = useTranslation()
  const { currentSite } = useCurrentSite()
  const { data, isLoading } = trpc.stock.levels.list.useQuery(
    { siteId: currentSite?.id ?? '' },
    { enabled: !!currentSite }
  )

  if (!currentSite) return null
  if (isLoading) return <div className="p-4 text-muted-foreground">{t('stock.common.loading')}</div>
  if (!data) return null

  const { items, locations, balances } = data

  // Total per item across all locations
  const totals = Object.fromEntries(
    items.map((item) => [
      item.id,
      locations.reduce((sum, loc) => sum + (balances[item.id]?.[loc.id] ?? 0), 0),
    ])
  )

  return (
    <div className="container mx-auto px-4 py-6 overflow-x-auto">
      <h1 className="text-2xl font-bold mb-4">{t('stock.levels')}</h1>

      {items.length === 0 ? (
        <p className="text-muted-foreground">{t('stock.common.noItemsYet')}</p>
      ) : (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-start py-2 pe-4 font-medium text-muted-foreground">
                {t('stock.item.name')}
              </th>
              {locations.map((loc) => (
                <th key={loc.id} className="py-2 px-3 font-medium text-center">
                  {loc.name}
                </th>
              ))}
              <th className="py-2 px-3 font-medium text-center text-muted-foreground">Σ</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b hover:bg-muted/40 transition-colors">
                <td className="py-3 pe-4">
                  <p className="font-medium">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.unit}</p>
                </td>
                {locations.map((loc) => {
                  const qty = balances[item.id]?.[loc.id] ?? 0
                  return (
                    <td
                      key={loc.id}
                      className={`py-3 px-3 text-center font-semibold tabular-nums ${
                        qty === 0 ? 'text-muted-foreground' : ''
                      }`}
                    >
                      {qty}
                    </td>
                  )
                })}
                <td className="py-3 px-3 text-center text-muted-foreground tabular-nums">
                  {totals[item.id]}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
