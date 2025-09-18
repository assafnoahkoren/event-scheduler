import { useState } from 'react'
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { httpBatchLink } from '@trpc/client'
import { trpc } from '@/utils/trpc'
import { config } from '@/services/config.service'

export function TRPCProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())

  // Create tRPC client that reads token dynamically
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: config.api.trpcUrl,
          fetch(url, options) {
            // Get token at request time, not at client creation time
            const token = localStorage.getItem('accessToken')
            return fetch(url, {
              ...options,
              credentials: 'include',
              headers: {
                ...options?.headers,
                authorization: token ? `Bearer ${token}` : '',
              },
            })
          },
        }),
      ],
    }),
  )

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  )
}