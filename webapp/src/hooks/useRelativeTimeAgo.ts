import { useMemo } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { enUS, he, ar } from 'date-fns/locale'
import { useTranslation } from 'react-i18next'

const localeMap = {
  en: enUS,
  he: he,
  ar: ar,
}

/**
 * Hook that formats a date as relative time (e.g., "2 hours ago", "in 3 days")
 * with proper locale support. Works for both past and future dates.
 * @param date - The date to format (can be Date object or string)
 * @returns Formatted relative time string
 */
export function useRelativeTimeFormat(date: string | Date): string {
  const { i18n } = useTranslation()

  const relativeTime = useMemo(() => {
    const targetDate = typeof date === 'string' ? new Date(date) : date
    const currentLocale = localeMap[i18n.language as keyof typeof localeMap] || enUS

    return formatDistanceToNow(targetDate, {
      addSuffix: true,
      locale: currentLocale,
    })
  }, [date, i18n.language])

  return relativeTime
}

// Keep the old export for backwards compatibility
export const useRelativeTimeAgo = useRelativeTimeFormat
