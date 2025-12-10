import { trpc } from '@/utils/trpc'
import { cn } from '@/lib/utils'

interface UserNameProps {
  userId: string
  className?: string
  fallback?: string
}

export function UserName({ userId, className, fallback = '...' }: UserNameProps) {
  const { data: user, isLoading } = trpc.users.getById.useQuery(
    { userId },
    { enabled: !!userId }
  )

  if (isLoading) {
    return <span className={cn('text-muted-foreground', className)}>{fallback}</span>
  }

  if (!user) {
    return null
  }

  const displayName =
    user.firstName || user.lastName
      ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim()
      : user.email

  return <span className={className}>{displayName}</span>
}
