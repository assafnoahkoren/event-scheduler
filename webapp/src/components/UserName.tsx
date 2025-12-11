import { cn } from '@/lib/utils'
import { useUserName } from '@/hooks/useUserName'

interface UserNameProps {
  userId: string
  className?: string
  fallback?: string
}

export function UserName({ userId, className, fallback = '...' }: UserNameProps) {
  const { name, isLoading } = useUserName(userId, fallback)

  if (isLoading) {
    return <span className={cn('text-muted-foreground', className)}>{fallback}</span>
  }

  if (!name) {
    return null
  }

  return <span className={className}>{name}</span>
}
