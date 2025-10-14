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

        return renderActivityNotification(
          activity.messageType,
          activity.data,
          {
            activityId: activity.id,
            userName,
            userAvatarUrl: activity.user.avatarUrl,
            isUnread,
            createdAt: new Date(activity.createdAt),
            t,
          }
        )
      })}
    </div>
  )
}
