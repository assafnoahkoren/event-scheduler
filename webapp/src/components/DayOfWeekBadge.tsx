import { Badge } from '@/components/ui/badge'
import { Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { useTranslation } from 'react-i18next'
import { useIsWeekend } from '@/hooks/useIsWeekend'

interface DayOfWeekBadgeProps {
  date: string | Date
  className?: string
}

export function DayOfWeekBadge({ date, className }: DayOfWeekBadgeProps) {
  const { t } = useTranslation()
  const { isWeekendDate } = useIsWeekend()
  const eventDate = typeof date === 'string' ? new Date(date) : date

  // Get the day of week (0 = Sunday, 6 = Saturday)
  const dayOfWeek = eventDate.getDay()

  // Get localized day name
  const getDayName = () => {
    const days = [
      t('calendar.weekdaysFull.sunday'),
      t('calendar.weekdaysFull.monday'),
      t('calendar.weekdaysFull.tuesday'),
      t('calendar.weekdaysFull.wednesday'),
      t('calendar.weekdaysFull.thursday'),
      t('calendar.weekdaysFull.friday'),
      t('calendar.weekdaysFull.saturday')
    ]
    return days[dayOfWeek]
  }

  // Check if it's a weekend day using the custom hook
  const isWeekend = isWeekendDate(eventDate)

  return (
    <Badge
      className={cn(
        "text-xs flex items-center gap-1",
        isWeekend
          ? "border-2 border-purple-300 text-purple-800 bg-white hover:bg-purple-50"
          : "border-2 border-slate-300 text-slate-800 bg-white hover:bg-slate-50",
        className
      )}
    >
      <Calendar className="w-3 h-3" />
      {getDayName()}
    </Badge>
  )
}