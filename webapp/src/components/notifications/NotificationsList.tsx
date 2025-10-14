import { useTranslation } from 'react-i18next'
import { trpc } from '@/utils/trpc'
import { useCurrentOrg } from '@/contexts/CurrentOrgContext'
import { renderActivityNotification } from '@/utils/activity-messages'
import type { inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from '../../../../server/src/routers/appRouter'

type RouterOutput = inferRouterOutputs<AppRouter>
type ActivityBase = RouterOutput['userActivity']['getOrganizationActivity']['activities'][0]

// Override the data type to avoid deep type instantiation issues with Prisma JSON
type Activity = Omit<ActivityBase, 'data'> & {
  data: any
}

export function NotificationsList() {
  const { t } = useTranslation()
  const { currentOrg } = useCurrentOrg()

  const { data: rawData, isLoading, error } = trpc.userActivity.getOrganizationActivity.useQuery(
    {
      organizationId: currentOrg?.id || '',
      limit: 50,
      offset: 0,
    },
    {
      enabled: !!currentOrg?.id,
    }
  )

  // Cast to avoid Prisma JSON type instantiation issues
  const data = rawData as any as { activities: Activity[], total: number, hasMore: boolean } | undefined

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
          <div key={activity.id}>
            {renderActivityNotification(
              activity.messageType,
              activity.data,
              {
                activityId: activity.id,
                userName,
                userAvatarUrl: activity.user.avatarUrl,
                activityType: getActivityTypeLabel(activity.activityType),
                activityTypeColor: getActivityTypeColor(activity.activityType),
                isUnread,
                eventTitle: activity.event?.title,
                createdAt: new Date(activity.createdAt),
                t,
              }
            )}
          </div>
        )
      })}
    </div>
  )
}
