import { Badge } from '@/components/ui/badge'
import { Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRelativeTime } from '@/hooks/useRelativeTime'

interface RelativeTimeBadgeProps {
  date: string | Date
  maxDays?: number
  className?: string
}

export function RelativeTimeBadge({ date, maxDays = 30, className }: RelativeTimeBadgeProps) {
  const relativeTime = useRelativeTime(date, maxDays)

  if (!relativeTime) {
    return null
  }

  const isUrgent = relativeTime.days <= 7

  return (
    <Badge
      className={cn(
        "text-xs flex items-center gap-1",
        isUrgent
          ? "bg-red-100 text-red-800 hover:bg-red-100"
          : "bg-amber-100 text-amber-800 hover:bg-amber-100",
        className
      )}
    >
      <Clock className="w-3 h-3" />
      {relativeTime.text}
    </Badge>
  )
}