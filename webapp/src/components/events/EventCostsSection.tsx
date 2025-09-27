import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { trpc } from '@/utils/trpc'

interface EventCostsSectionProps {
  eventId: string
}

export function EventCostsSection({ eventId }: EventCostsSectionProps) {
  const { t } = useTranslation()

  // Fetch event costs
  const { data: costs, isLoading, error } = trpc.events.calculateCosts.useQuery(
    { eventId },
    { enabled: !!eventId }
  )

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>{t('common.loading')}</span>
      </div>
    )
  }

  // Show error state or if no data
  if (error || !costs) {
    return null
  }

  const formatCurrency = (amount: number) => {
    const currencySymbol = costs.currency === 'ILS' ? '₪' :
                          costs.currency === 'USD' ? '$' :
                          costs.currency === 'EUR' ? '€' :
                          costs.currency === 'GBP' ? '£' :
                          costs.currency
    return `${currencySymbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
  }

  const profitPercentage = costs.clientCost > 0
    ? ((costs.profit / costs.clientCost) * 100).toFixed(0)
    : '0'

  return (
    <div className="flex items-center gap-4 px-3 py-2 bg-muted/50 rounded-md text-sm overflow-x-auto">
      <div className="flex items-center gap-1.5">
        <span className="text-muted-foreground">{t('events.clientCost')}:</span>
        <span className="font-medium">{formatCurrency(costs.clientCost)}</span>
      </div>

      <span className="text-muted-foreground">-</span>

      <div className="flex items-center gap-1.5">
        <span className="text-muted-foreground">{t('events.providerCost')}:</span>
        <span className="font-medium">{formatCurrency(costs.providerCost)}</span>
      </div>

      <span className="text-muted-foreground">=</span>

      <div className="flex items-center gap-1.5">
        <span className="text-muted-foreground">{t('events.profit')}:</span>
        <span className={cn(
          "font-semibold",
          costs.profit >= 0 ? "text-green-600" : "text-red-600"
        )}>
          {formatCurrency(costs.profit)}
        </span>
        <span className={cn(
          "text-xs",
          costs.profit >= 0 ? "text-green-600/80" : "text-red-600/80"
        )}>
          ({profitPercentage}%)
        </span>
      </div>
    </div>
  )
}