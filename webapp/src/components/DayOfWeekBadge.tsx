import { Badge } from '@/components/ui/badge'
import { Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { useTranslation } from 'react-i18next'

interface DayOfWeekBadgeProps {
  date: string | Date
  className?: string
}

export function DayOfWeekBadge({ date, className }: DayOfWeekBadgeProps) {
  const { t } = useTranslation()
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

  // Weekend days get different color
  const isWeekend = dayOfWeek === 4 || dayOfWeek === 5

  return (
    <Badge
      className={cn(
        "text-xs flex items-center gap-1",
        isWeekend
          ? "bg-purple-100 text-purple-800 hover:bg-purple-100"
          : "bg-slate-100 text-slate-800 hover:bg-slate-100",
        className
      )}
    >
      <Calendar className="w-3 h-3" />
      {getDayName()}
    </Badge>
  )
}