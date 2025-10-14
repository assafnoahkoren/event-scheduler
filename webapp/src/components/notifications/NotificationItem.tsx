import { formatDistanceToNow } from 'date-fns'
import type { ReactNode } from 'react'
import { useAutoMarkViewed } from '@/hooks/useAutoMarkViewed'

interface NotificationItemProps {
  activityId: string
  userName: string
  userAvatarUrl?: string | null
  isUnread: boolean
  createdAt: Date
  children: ReactNode
}

export function NotificationItem({
  activityId,
  userName,
  userAvatarUrl,
  isUnread,
  createdAt,
  children,
}: NotificationItemProps) {
  useAutoMarkViewed({ activityId, isUnread })

  return (
    <div className={`relative px-4 py-3 transition-colors hover:bg-muted/30 ${
      isUnread ? 'bg-blue-50 dark:bg-blue-950/20' : ''
    }`}>
      {/* Unread indicator */}
      {isUnread && (
        <div className="absolute start-0 top-0 bottom-0 w-1 bg-primary" />
      )}

      <div className="flex items-start gap-3">
        {/* User Avatar */}
        <div className="flex-shrink-0">
          {userAvatarUrl ? (
            <img
              src={userAvatarUrl}
              alt={userName}
              className="w-9 h-9 rounded-full ring-2 ring-background"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center ring-2 ring-background">
              <span className="text-xs font-semibold text-primary">
                {userName.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-1">
          <p className="text-sm leading-relaxed">
            <span className="font-semibold text-foreground">{userName}</span>{' '}
            <span className="text-muted-foreground">{children}</span>
          </p>
          <time className="text-xs text-muted-foreground/80">
            {formatDistanceToNow(createdAt, { addSuffix: true })}
          </time>
        </div>
      </div>
    </div>
  )
}
