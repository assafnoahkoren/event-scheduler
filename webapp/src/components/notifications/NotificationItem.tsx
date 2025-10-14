import { formatDistanceToNow } from 'date-fns'
import type { ReactNode } from 'react'

interface NotificationItemProps {
  userName: string
  userAvatarUrl?: string | null
  activityType: string
  activityTypeColor: string
  isUnread: boolean
  eventTitle?: string | null
  createdAt: Date
  onClick: () => void
  children: ReactNode
}

export function NotificationItem({
  userName,
  userAvatarUrl,
  activityType,
  activityTypeColor,
  isUnread,
  eventTitle,
  createdAt,
  onClick,
  children,
}: NotificationItemProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-start p-4 hover:bg-muted/50 transition-colors ${
        isUnread ? 'bg-blue-50 dark:bg-blue-950/20' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        {/* User Avatar */}
        <div className="flex-shrink-0">
          {userAvatarUrl ? (
            <img
              src={userAvatarUrl}
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
            <span className={`text-xs font-medium ${activityTypeColor}`}>
              {activityType}
            </span>
            {isUnread && (
              <span className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0" />
            )}
          </div>
          <div className="text-sm text-muted-foreground mt-1 line-clamp-2">
            {children}
          </div>
          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
            <time>
              {formatDistanceToNow(createdAt, { addSuffix: true })}
            </time>
            {eventTitle && (
              <>
                <span>•</span>
                <span className="truncate">{eventTitle}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </button>
  )
}
