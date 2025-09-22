import { useTranslation } from 'react-i18next'

export function useRelativeTime(date: string | Date, maxDays: number = 30) {
  const { t } = useTranslation()

  const eventDate = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffInMs = eventDate.getTime() - now.getTime()
  const diffInDays = Math.ceil(diffInMs / (1000 * 60 * 60 * 24))

  // Only show for future events within maxDays
  if (diffInDays > 0 && diffInDays <= maxDays) {
    const text = diffInDays === 1
      ? t('events.tomorrow')
      : t('events.inDays', { days: diffInDays })

    return { text, days: diffInDays }
  }

  return null
}