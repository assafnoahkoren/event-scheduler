import { useDateFormatter } from '@/hooks/useDateFormatter'
import { cn } from '@/lib/utils'
import type { HTMLAttributes } from 'react'

export type DateVariant =
  | 'default'        // Organization's default format or 'PP'
  | 'full'           // Full date with year (e.g., "January 5, 2024")
  | 'short'          // Short format (e.g., "Jan 5")
  | 'dayMonth'       // Day/month only (e.g., "15/01")
  | 'longWithDay'    // Long with day name (e.g., "Monday, January 5")
  | 'dateTime'       // Date with time (e.g., "Jan 5, 2024 at 3:30 PM")
  | 'time'           // Time only (e.g., "3:30 PM")
  | 'relative'       // Relative time (e.g., "2 days ago")

interface FormattedDateProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  /**
   * The date to format (Date object or ISO string)
   */
  date: Date | string

  /**
   * The format variant to use
   * @default 'default'
   */
  variant?: DateVariant

  /**
   * Custom format string (overrides variant)
   * Uses date-fns format tokens
   */
  format?: string
}

/**
 * FormattedDate component that renders formatted dates consistently across the app.
 * Uses the organization's date format by default.
 *
 * @example
 * ```tsx
 * // Default format (uses organization settings)
 * <FormattedDate date={event.createdAt} />
 *
 * // Full date
 * <FormattedDate date={event.createdAt} variant="full" />
 *
 * // Relative time
 * <FormattedDate date={event.createdAt} variant="relative" />
 *
 * // Custom format
 * <FormattedDate date={event.createdAt} format="yyyy-MM-dd" />
 *
 * // With custom styling
 * <FormattedDate date={event.createdAt} className="text-muted-foreground" />
 * ```
 */
export function FormattedDate({ date, variant = 'default', format, className, ...props }: FormattedDateProps) {
  const {
    formatDate,
    formatFullDate,
    formatShortDate,
    formatDayMonth,
    formatLongDateWithDay,
    formatDateTime,
    formatTime,
    formatRelativeTime,
  } = useDateFormatter()

  let formattedDate: string

  // If custom format is provided, use it
  if (format) {
    formattedDate = formatDate(date, format)
  } else {
    // Otherwise use the variant
    switch (variant) {
      case 'full':
        formattedDate = formatFullDate(date)
        break
      case 'short':
        formattedDate = formatShortDate(date)
        break
      case 'dayMonth':
        formattedDate = formatDayMonth(date)
        break
      case 'longWithDay':
        formattedDate = formatLongDateWithDay(date)
        break
      case 'dateTime':
        formattedDate = formatDateTime(date)
        break
      case 'time':
        formattedDate = formatTime(date)
        break
      case 'relative':
        formattedDate = formatRelativeTime(date)
        break
      case 'default':
      default:
        formattedDate = formatDate(date)
        break
    }
  }

  return (
    <span className={cn(className)} {...props}>
      {formattedDate}
    </span>
  )
}
