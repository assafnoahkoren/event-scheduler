import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { httpBatchLink } from '@trpc/client'
import { trpc } from './utils/trpc'
import { config } from './services/config.service'
import { DirectionProvider } from './contexts/DirectionContext'
import App from './App'

export function Root() {
  const [queryClient] = useState(() => new QueryClient())
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: config.api.trpcUrl,
        }),
      ],
    }),
  )

  return (
    <DirectionProvider>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </trpc.Provider>
    </DirectionProvider>
  )
}