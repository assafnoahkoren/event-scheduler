import { useState, useEffect } from 'react'
import { trpc } from '@/utils/trpc'

interface UseSignedUrlOptions {
  fileId: string | undefined | null
  expiresIn?: number // seconds, default 1 hour
}

export function useSignedUrl({ fileId, expiresIn = 3600 }: UseSignedUrlOptions) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null)

  const getSignedUrlMutation = trpc.files.getSignedUrl.useMutation({
    onSuccess: (data) => {
      setSignedUrl(data.url)
    },
  })

  useEffect(() => {
    if (fileId) {
      getSignedUrlMutation.mutate({ fileId, expiresIn })
    } else {
      setSignedUrl(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileId, expiresIn])

  return {
    signedUrl,
    isLoading: getSignedUrlMutation.isPending,
    error: getSignedUrlMutation.error,
    refetch: () => {
      if (fileId) {
        getSignedUrlMutation.mutate({ fileId, expiresIn })
      }
    },
  }
}
