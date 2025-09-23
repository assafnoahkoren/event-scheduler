import { useTranslation } from 'react-i18next'
import { DollarSign, TrendingUp, Wallet, Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
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
      <div className="pt-4 border-t">
        <h3 className="text-lg font-semibold mb-4">{t('events.costBreakdown')}</h3>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  // Show error state
  if (error || !costs) {
    return (
      <div className="pt-4 border-t">
        <h3 className="text-lg font-semibold mb-4">{t('events.costBreakdown')}</h3>
        <div className="text-center py-8 text-muted-foreground">
          {t('events.costCalculationError')}
        </div>
      </div>
    )
  }

  const formatCurrency = (amount: number) => {
    // Use currency symbol based on currency code
    const currencySymbol = costs.currency === 'ILS' ? '₪' :
                          costs.currency === 'USD' ? '$' :
                          costs.currency === 'EUR' ? '€' :
                          costs.currency === 'GBP' ? '£' :
                          costs.currency

    return `${currencySymbol}${amount.toFixed(2)}`
  }

  return (
    <div className="pt-4 border-t">
      <h3 className="text-lg font-semibold mb-4">{t('events.costBreakdown')}</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Client Cost Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t('events.clientCost')}
                </p>
                <p className="text-2xl font-bold">
                  {formatCurrency(costs.clientCost)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        {/* Provider Cost Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t('events.providerCost')}
                </p>
                <p className="text-2xl font-bold">
                  {formatCurrency(costs.providerCost)}
                </p>
              </div>
              <Wallet className="h-8 w-8 text-orange-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        {/* Profit Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t('events.profit')}
                </p>
                <p className={cn(
                  "text-2xl font-bold",
                  costs.profit >= 0 ? "text-green-600" : "text-red-600"
                )}>
                  {formatCurrency(costs.profit)}
                </p>
                {/* Optional: Show profit margin percentage */}
                {costs.clientCost > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {((costs.profit / costs.clientCost) * 100).toFixed(1)}% {t('events.margin')}
                  </p>
                )}
              </div>
              <TrendingUp className={cn(
                "h-8 w-8 opacity-50",
                costs.profit >= 0 ? "text-green-500" : "text-red-500 rotate-180"
              )} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Optional: Summary row */}
      <div className="mt-4 p-4 bg-muted/50 rounded-lg">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{t('events.profitMargin')}</span>
          <span className={cn(
            "font-semibold",
            costs.profit >= 0 ? "text-green-600" : "text-red-600"
          )}>
            {costs.clientCost > 0
              ? `${((costs.profit / costs.clientCost) * 100).toFixed(1)}%`
              : '0.0%'
            }
          </span>
        </div>
      </div>
    </div>
  )
}