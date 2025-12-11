import { trpc } from '@/utils/trpc'

interface UseUserNameResult {
  name: string | null
  isLoading: boolean
}

export function useUserName(userId: string | undefined, fallback = '...'): UseUserNameResult {
  const { data: user, isLoading } = trpc.users.getById.useQuery(
    { userId: userId! },
    { enabled: !!userId }
  )

  if (isLoading) {
    return { name: fallback, isLoading: true }
  }

  if (!user) {
    return { name: null, isLoading: false }
  }

  const displayName =
    user.firstName || user.lastName
      ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim()
      : user.email

  return { name: displayName, isLoading: false }
}
