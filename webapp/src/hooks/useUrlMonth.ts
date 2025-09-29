import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { parseMonthFromUrl, formatMonthForUrl } from '@/utils/dateUtils'

/**
 * Custom hook for synchronizing month state with URL parameters
 * @param defaultMonth - Default month to use if no URL parameter is present
 * @returns Tuple of [currentMonth, setMonth] where setMonth also updates the URL
 */
export function useUrlMonth(defaultMonth: Date = new Date()) {
  const [searchParams, setSearchParams] = useSearchParams()

  // Initialize month from URL param or default
  const getInitialMonth = (): Date => {
    const monthParam = searchParams.get('month')
    const parsedMonth = parseMonthFromUrl(monthParam)
    return parsedMonth || defaultMonth
  }

  const [month, setMonth] = useState<Date>(getInitialMonth())

  // Update URL when month changes
  useEffect(() => {
    const monthParam = formatMonthForUrl(month)
    const currentMonthParam = searchParams.get('month')

    if (currentMonthParam !== monthParam) {
      setSearchParams(prev => {
        const newParams = new URLSearchParams(prev)
        newParams.set('month', monthParam)
        return newParams
      }, { replace: true })
    }
  }, [month, searchParams, setSearchParams])

  return [month, setMonth] as const
}