import { useTranslation } from 'react-i18next'
import { trpc } from '@/utils/trpc'
import { useCurrentOrg } from '@/contexts/CurrentOrgContext'
import { formatDistanceToNow } from 'date-fns'
import { renderActivityMessage } from '@/utils/activity-messages'
import type { inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from '../../../../server/src/routers/appRouter'

type RouterOutput = inferRouterOutputs<AppRouter>
type Activity = RouterOutput['userActivity']['getOrganizationActivity']['activities'][0]

interface NotificationsListProps {
  onActivityClick?: (activity: Activity) => void
}

export function NotificationsList({ onActivityClick }: NotificationsListProps) {
  const { t } = useTranslation()
  const { currentOrg } = useCurrentOrg()

  const { data, isLoading, error } = trpc.userActivity.getOrganizationActivity.useQuery(
    {
      organizationId: currentOrg?.id || '',
      limit: 50,
      offset: 0,
    },
    {
      enabled: !!currentOrg?.id,
    }
  )

  const markViewedMutation = trpc.userActivity.markViewed.useMutation()

  const handleActivityClick = (activity: Activity) => {
    // Mark as viewed
    if (!activity.views || activity.views.length === 0) {
      markViewedMutation.mutate({ activityId: activity.id })
    }

    // Call parent callback if provided
    onActivityClick?.(activity)
  }

  const getActivityTypeLabel = (type: Activity['activityType']) => {
    const typeLabels: Record<Activity['activityType'], string> = {
      CREATE: t('common.create'),
      EDIT: t('common.edit'),
      DELETE: t('common.delete'),
      ACCESS: 'accessed',
      INVITE: 'invited',
      ACCEPT: 'accepted',
      REJECT: 'rejected',
      UPLOAD: 'uploaded',
      DOWNLOAD: 'downloaded',
      SHARE: 'shared',
    }
    return typeLabels[type] || type
  }

  const getActivityTypeColor = (type: Activity['activityType']) => {
    const typeColors: Record<Activity['activityType'], string> = {
      CREATE: 'text-green-600 dark:text-green-400',
      EDIT: 'text-blue-600 dark:text-blue-400',
      DELETE: 'text-red-600 dark:text-red-400',
      ACCESS: 'text-gray-600 dark:text-gray-400',
      INVITE: 'text-purple-600 dark:text-purple-400',
      ACCEPT: 'text-green-600 dark:text-green-400',
      REJECT: 'text-red-600 dark:text-red-400',
      UPLOAD: 'text-blue-600 dark:text-blue-400',
      DOWNLOAD: 'text-gray-600 dark:text-gray-400',
      SHARE: 'text-purple-600 dark:text-purple-400',
    }
    return typeColors[type] || 'text-gray-600 dark:text-gray-400'
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-sm text-muted-foreground">{t('common.loading')}</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-sm text-red-600">{t('common.error')}</div>
      </div>
    )
  }

  if (!data || data.activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <div className="text-sm text-muted-foreground">No notifications yet</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col divide-y">
      {data.activities.map((activity) => {
        const isUnread = !activity.views || activity.views.length === 0
        const userName = activity.user.firstName && activity.user.lastName
          ? `${activity.user.firstName} ${activity.user.lastName}`
          : activity.user.email

        return (
          <button
            key={activity.id}
            onClick={() => handleActivityClick(activity)}
            className={`w-full text-start p-4 hover:bg-muted/50 transition-colors ${
              isUnread ? 'bg-blue-50 dark:bg-blue-950/20' : ''
            }`}
          >
            <div className="flex items-start gap-3">
              {/* User Avatar */}
              <div className="flex-shrink-0">
                {activity.user.avatarUrl ? (
                  <img
                    src={activity.user.avatarUrl}
                    alt={userName}
                    className="w-8 h-8 rounded-full"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-xs font-medium text-primary">
                      {userName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>

              {/* Activity Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="font-medium text-sm">{userName}</span>
                  <span className={`text-xs font-medium ${getActivityTypeColor(activity.activityType)}`}>
                    {getActivityTypeLabel(activity.activityType)}
                  </span>
                  {isUnread && (
                    <span className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {renderActivityMessage(activity.messageType, activity.messageData, t)}
                </p>
                <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                  <time>
                    {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                  </time>
                  {activity.event && (
                    <>
                      <span>•</span>
                      <span className="truncate">{activity.event.title}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
