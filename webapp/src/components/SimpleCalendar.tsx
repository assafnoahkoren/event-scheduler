import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useTranslation } from 'react-i18next'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
  getMonth,
  getYear,
} from 'date-fns'

interface SimpleCalendarProps {
  selected?: Date
  onSelect?: (date: Date | undefined) => void
  month?: Date
  onMonthChange?: (date: Date) => void
  className?: string
  dir?: 'ltr' | 'rtl'
  disabled?: boolean
  modifiers?: {
    hasEvents?: Date[]
  }
  modifiersClassNames?: {
    hasEvents?: string
  }
  renderCell?: (date: Date, props: {
    isSelected: boolean
    isCurrentMonth: boolean
    isToday: boolean
    hasEvent: boolean
  }) => React.ReactNode
}

export function SimpleCalendar({
  selected,
  onSelect,
  month = new Date(),
  onMonthChange,
  className,
  dir = 'ltr',
  disabled = false,
  modifiers = {},
  modifiersClassNames = {},
  renderCell,
}: SimpleCalendarProps) {
  const { t } = useTranslation()
  const [currentMonth, setCurrentMonth] = useState(month)

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth))
    const end = endOfWeek(endOfMonth(currentMonth))
    const days: Date[] = []
    let current = start

    while (current <= end) {
      days.push(current)
      current = addDays(current, 1)
    }

    return days
  }, [currentMonth])

  const weekDays = dir === 'rtl'
    ? ['ש', 'ו', 'ה', 'ד', 'ג', 'ב', 'א'] // Hebrew days
    : ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

  const handlePreviousMonth = () => {
    const newMonth = subMonths(currentMonth, 1)
    setCurrentMonth(newMonth)
    onMonthChange?.(newMonth)
  }

  const handleNextMonth = () => {
    const newMonth = addMonths(currentMonth, 1)
    setCurrentMonth(newMonth)
    onMonthChange?.(newMonth)
  }

  const handleDayClick = (day: Date) => {
    if (disabled || !isSameMonth(day, currentMonth)) return

    if (selected && isSameDay(day, selected)) {
      onSelect?.(undefined)
    } else {
      onSelect?.(day)
    }
  }

  const isEventDay = (day: Date) => {
    return modifiers.hasEvents?.some(eventDate => isSameDay(eventDate, day))
  }

  const getMonthName = (date: Date) => {
    const monthIndex = getMonth(date)
    const monthKeys = [
      'january', 'february', 'march', 'april', 'may', 'june',
      'july', 'august', 'september', 'october', 'november', 'december'
    ]
    return t(`calendar.months.${monthKeys[monthIndex]}`)
  }

  return (
    <div className={cn("p-3 rounded-md", className)} dir={dir}>
      {/* Header with month navigation */}
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7"
          onClick={handlePreviousMonth}
          disabled={disabled}
        >
          {dir === 'rtl' ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>

        <div className="text-sm font-medium">
          {getMonthName(currentMonth)} {getYear(currentMonth)}
        </div>

        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7"
          onClick={handleNextMonth}
          disabled={disabled}
        >
          {dir === 'rtl' ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </Button>
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Weekday headers */}
        {weekDays.map((day, index) => (
          <div
            key={index}
            className="aspect-square min-h-[20px] flex items-center justify-center text-sm font-medium text-muted-foreground"
          >
            {day}
          </div>
        ))}

        {/* Calendar days */}
        {days.map((day, index) => {
          const isSelected = selected && isSameDay(day, selected)
          const isCurrentMonth = isSameMonth(day, currentMonth)
          const isTodayDate = isToday(day)
          const hasEvent = isEventDay(day)

          // Use custom render function if provided
          if (renderCell) {
            return (
              <div
                key={index}
                onClick={() => !disabled && isCurrentMonth && handleDayClick(day)}
                className={cn(
                  "relative aspect-square w-full cursor-pointer",
                  disabled || !isCurrentMonth ? "cursor-not-allowed opacity-50" : ""
                )}
              >
                {renderCell(day, {
                  isSelected,
                  isCurrentMonth,
                  isToday: isTodayDate,
                  hasEvent,
                })}
              </div>
            )
          }

          // Default rendering
          return (
            <button
              key={index}
              onClick={() => handleDayClick(day)}
              disabled={disabled || !isCurrentMonth}
              className={cn(
                "relative aspect-square w-full p-0 text-center text-sm",
                "hover:bg-accent hover:text-accent-foreground",
                "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                {
                  "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground": isSelected,
                  "bg-accent text-accent-foreground": isTodayDate && !isSelected,
                  "text-muted-foreground": !isCurrentMonth,
                  [modifiersClassNames.hasEvents || ""]: hasEvent && isCurrentMonth,
                }
              )}
            >
              <span className={cn(
                "inline-flex h-full w-full items-center justify-center",
                hasEvent && isCurrentMonth && "font-bold text-primary"
              )}>
                {format(day, 'd')}
              </span>
              {hasEvent && isCurrentMonth && (
                <div className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-primary" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}