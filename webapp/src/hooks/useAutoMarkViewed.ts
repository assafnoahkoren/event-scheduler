import { useEffect } from 'react'
import { trpc } from '@/utils/trpc'

interface UseAutoMarkViewedOptions {
  activityId: string
  isUnread: boolean
  delayMs?: number
}

/**
 * Hook that automatically marks an activity as viewed after a delay
 * @param activityId - The ID of the activity to mark as viewed
 * @param isUnread - Whether the activity is currently unread
 * @param delayMs - Delay in milliseconds before marking as viewed (default: 3000ms)
 */
export function useAutoMarkViewed({
  activityId,
  isUnread,
  delayMs = 1000
}: UseAutoMarkViewedOptions) {
  const utils = trpc.useUtils()
  const markViewedMutation = trpc.userActivity.markViewed.useMutation({
    onSuccess: () => {
      // Invalidate the unviewed count query to update the badge
      utils.userActivity.getUnviewedCount.invalidate()
    }
  })

  useEffect(() => {
    if (!isUnread) return

    const timeoutId = setTimeout(() => {
      markViewedMutation.mutate({ activityId })
    }, delayMs)

    return () => clearTimeout(timeoutId)
  }, [activityId, isUnread, delayMs, markViewedMutation])
}
