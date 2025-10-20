import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { trpc } from '@/utils/trpc'
import { useCurrentSite } from '@/contexts/CurrentSiteContext'
import { cn } from '@/lib/utils'
import { Loader2, TrendingUp, TrendingDown } from 'lucide-react'
import { FormattedDate } from '@/components/ui/date'

interface ProfitChartProps {
  startDate: string
  endDate: string
  className?: string
}

export function ProfitChart({ startDate, endDate, className }: ProfitChartProps) {
  const { t } = useTranslation()
  const { currentSite } = useCurrentSite()

  const { data, isLoading } = trpc.events.profitByDateRange.useQuery(
    {
      siteId: currentSite?.id || '',
      startDate,
      endDate
    },
    { enabled: !!currentSite?.id && !!startDate && !!endDate }
  )

  const formatCurrency = (value: number) => {
    return `₪${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
  }

  const chartData = useMemo(() => {
    if (!data?.data) return []
    return data.data.map(item => ({
      ...item,
      displayDate: new Date(item.date).getDate().toString()
    }))
  }, [data])

  const maxProfit = useMemo(() => {
    if (!chartData.length) return 0
    return Math.max(...chartData.map(d => d.profit))
  }, [chartData])

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload[0]) {
      const data = payload[0].payload
      return (
        <div className="bg-background border rounded-md p-2 shadow-sm">
          <p className="text-xs font-medium">
            <FormattedDate date={data.date} variant="full" />
          </p>
          <p className={cn(
            "text-xs font-semibold",
            data.profit >= 0 ? "text-green-600" : "text-red-600"
          )}>
            {formatCurrency(data.profit)}
          </p>
        </div>
      )
    }
    return null
  }

  // Maintain consistent component height
  if (isLoading) {
    return (
      <div className={cn("space-y-2 relative", className)}>
        {/* Summary placeholder - matching the absolute positioned summary */}
        <div className="absolute w-full -bottom-6">
          <div className="flex items-center justify-center w-full absolute">
            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
          </div>
        </div>

        {/* Chart placeholder with fixed height */}
        <div className="h-[60px] w-full flex items-center justify-center">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  // If no data, show empty state with same height
  if (!data || !chartData.length) {
    return (
      <div className={cn("space-y-2 relative", className)}>
        {/* Summary with 0 - matching the absolute positioned summary */}
        <div className="absolute w-full -bottom-6">
          <div className="flex items-center justify-center w-full absolute">
            <span className="text-sm font-bold text-muted-foreground">
              {formatCurrency(0)}
            </span>
          </div>
        </div>

        {/* Empty chart placeholder */}
        <div className="h-[60px] w-full flex items-center justify-center">
          <span className="text-xs text-muted-foreground">{t('events.noData')}</span>
        </div>
      </div>
    )
  }

  const isProfit = data.totalProfit >= 0

  return (
    <div className={cn("space-y-2 relative", className)}>
      {/* Summary */}
      <div className="absolute w-full -bottom-6">
        <div className="flex items-center justify-center w-full absolute">
          {isProfit ? (
            <TrendingUp className="me-1 h-3 w-3 text-green-600" />
          ) : (
            <TrendingDown className="me-1 h-3 w-3 text-red-600" />
          )}
          <span className={cn(
            "text-sm font-bold",
            isProfit ? "text-green-600" : "text-red-600"
          )}>
            {formatCurrency(data.totalProfit)}
          </span>
        </div>
      </div>

      {/* Chart */}
      <div className="h-[60px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 2, right: 2, left: 2, bottom: 2 }}
          >
            <defs>
              <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="lossGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="displayDate"
              tick={{ fontSize: 9 }}
              tickLine={false}
              axisLine={false}
              height={20}
            />
            <YAxis
              hide
              domain={[0, maxProfit * 1.1]}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ strokeDasharray: '3 3' }}
            />
            <Area
              type="monotone"
              dataKey="profit"
              stroke={isProfit ? "#10b981" : "#ef4444"}
              strokeWidth={1.5}
              fill={isProfit ? "url(#profitGradient)" : "url(#lossGradient)"}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}