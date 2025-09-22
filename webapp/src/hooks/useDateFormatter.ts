import { useTranslation } from 'react-i18next'
import { format, formatDistance, formatRelative, isToday, isTomorrow, isYesterday } from 'date-fns'
import { enUS, he, ar } from 'date-fns/locale'
import { useMemo } from 'react'

// Locale mapping
const localeMap = {
  'en': enUS,
  'he': he,
  'ar': ar
} as const

type LocaleKey = keyof typeof localeMap

/**
 * Hook that provides localized date formatting functions
 */
export function useDateFormatter() {
  const { i18n, t } = useTranslation()

  const locale = useMemo(() => {
    const currentLang = i18n.language as LocaleKey
    return localeMap[currentLang] || enUS
  }, [i18n.language])

  /**
   * Format a date with a custom format string
   * @param date - Date to format
   * @param formatStr - Format string (default: 'PP' for localized date)
   * @returns Formatted date string
   */
  const formatDate = (date: Date | string, formatStr: string = 'PP') => {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    return format(dateObj, formatStr, { locale })
  }

  /**
   * Format a date for display in lists (short format)
   * @param date - Date to format
   * @returns Short formatted date (e.g., "Jan 5" or "5 ינו")
   */
  const formatShortDate = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    return format(dateObj, 'MMM d', { locale })
  }

  /**
   * Format a date with day and month
   * @param date - Date to format
   * @returns Formatted date (e.g., "15/01" or "01/15" depending on locale)
   */
  const formatDayMonth = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    // Use localized short date pattern
    return format(dateObj, 'dd/MM', { locale })
  }

  /**
   * Format a full date with year
   * @param date - Date to format
   * @returns Full formatted date (e.g., "January 5, 2024")
   */
  const formatFullDate = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    return format(dateObj, 'PPP', { locale })
  }

  /**
   * Format a long date with day name
   * @param date - Date to format
   * @returns Long formatted date with day name (e.g., "Monday, January 5")
   */
  const formatLongDateWithDay = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    return format(dateObj, 'EEEE, MMMM d', { locale })
  }

  /**
   * Format a date with time
   * @param date - Date to format
   * @returns Date with time (e.g., "Jan 5, 2024 at 3:30 PM")
   */
  const formatDateTime = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    return format(dateObj, 'PPp', { locale })
  }

  /**
   * Format time only
   * @param date - Date to format
   * @returns Time string (e.g., "3:30 PM" or "15:30")
   */
  const formatTime = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    return format(dateObj, 'p', { locale })
  }

  /**
   * Format relative time (e.g., "2 days ago", "in 3 hours")
   * @param date - Date to format
   * @param baseDate - Base date to compare to (default: now)
   * @returns Relative time string
   */
  const formatRelativeTime = (date: Date | string, baseDate: Date = new Date()) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    return formatDistance(dateObj, baseDate, { locale, addSuffix: true })
  }

  /**
   * Format relative date with context (e.g., "today at 3:30 PM", "yesterday", "Monday at 2:00 PM")
   * @param date - Date to format
   * @param baseDate - Base date to compare to (default: now)
   * @returns Contextual relative date string
   */
  const formatRelativeDate = (date: Date | string, baseDate: Date = new Date()) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    return formatRelative(dateObj, baseDate, { locale })
  }

  /**
   * Get a human-readable date label
   * @param date - Date to check
   * @returns "Today", "Tomorrow", "Yesterday" or formatted date
   */
  const getDateLabel = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date

    if (isToday(dateObj)) {
      return t('common.today')
    }

    if (isTomorrow(dateObj)) {
      return t('common.tomorrow')
    }

    if (isYesterday(dateObj)) {
      return t('common.yesterday')
    }

    return formatShortDate(dateObj)
  }

  /**
   * Format date for API/database (ISO string)
   * @param date - Date to format
   * @returns ISO date string
   */
  const formatISO = (date: Date) => {
    return date.toISOString()
  }

  return {
    formatDate,
    formatShortDate,
    formatDayMonth,
    formatFullDate,
    formatLongDateWithDay,
    formatDateTime,
    formatTime,
    formatRelativeTime,
    formatRelativeDate,
    getDateLabel,
    formatISO,
    locale // Export the locale in case components need it directly
  }
}

/**
 * Hook for formatting dates consistently across the app
 * This is a simplified version that returns the most commonly used formatter
 */
export function useFormatDate() {
  const { formatDate } = useDateFormatter()
  return formatDate
}

/**
 * Hook for formatting short dates (for lists, cards, etc.)
 */
export function useFormatShortDate() {
  const { formatShortDate } = useDateFormatter()
  return formatShortDate
}

/**
 * Hook for formatting relative times
 */
export function useFormatRelativeTime() {
  const { formatRelativeTime } = useDateFormatter()
  return formatRelativeTime
}

/**
 * Hook for formatting day/month dates
 */
export function useFormatDayMonth() {
  const { formatDayMonth } = useDateFormatter()
  return formatDayMonth
}

/**
 * Hook for formatting long dates with day name
 */
export function useFormatLongDateWithDay() {
  const { formatLongDateWithDay } = useDateFormatter()
  return formatLongDateWithDay
}