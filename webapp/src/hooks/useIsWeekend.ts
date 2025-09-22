/**
 * Custom hook to determine if a given date or day of week is a weekend
 * Centralizes the weekend definition for the application
 */
export function useIsWeekend() {
  /**
   * Check if a date is a weekend day
   * @param date - The date to check
   * @returns true if the date falls on a weekend (Thursday or Friday)
   */
  const isWeekendDate = (date: Date): boolean => {
    const dayOfWeek = date.getDay()
    return isWeekendDay(dayOfWeek)
  }

  /**
   * Get the weekend day indices
   * @returns Array of day indices that are considered weekends
   */
  const getWeekendDays = (): number[] => {
    return [4, 5] // Thursday and Friday
  }

  /**
   * Check if a day of week number is a weekend day
   * @param dayOfWeek - Day of week (0 = Sunday, 6 = Saturday)
   * @returns true if the day is a weekend (Thursday = 4 or Friday = 5)
   */
  const isWeekendDay = (dayOfWeek: number): boolean => {
    return getWeekendDays().includes(dayOfWeek)
  }

  return {
    isWeekendDate,
    isWeekendDay,
    getWeekendDays
  }
}