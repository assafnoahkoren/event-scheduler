import { parseISO, isValid, format } from 'date-fns'

/**
 * Parses a month string from URL parameter in YYYY-MM format
 * @param monthParam - The month parameter from URL (e.g., "2025-01")
 * @returns Parsed Date object or null if invalid
 */
export function parseMonthFromUrl(monthParam: string | null): Date | null {
  if (!monthParam) return null

  try {
    const parsedDate = parseISO(monthParam + '-01') // Add day to make it a valid date
    return isValid(parsedDate) ? parsedDate : null
  } catch (error) {
    console.error('Failed to parse month from URL:', error)
    return null
  }
}

/**
 * Formats a Date object to YYYY-MM format for URL parameters
 * @param date - The date to format
 * @returns Formatted month string (e.g., "2025-01")
 */
export function formatMonthForUrl(date: Date): string {
  return format(date, 'yyyy-MM')
}