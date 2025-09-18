interface AppConfig {
  api: {
    baseUrl: string
    trpcUrl: string
    timeout: number
  }
  app: {
    name: string
    version: string
    environment: 'development' | 'staging' | 'production'
  }
  features: {
    debugMode: boolean
  }
}

function extractBaseUrl(trpcUrl: string): string {
  try {
    const url = new URL(trpcUrl)
    return `${url.protocol}//${url.host}`
  } catch {
    return 'http://localhost:3000'
  }
}

function createConfig(): AppConfig {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/trpc'
  const baseUrl = extractBaseUrl(apiUrl)

  return {
    api: {
      baseUrl,
      trpcUrl: apiUrl,
      timeout: parseInt(import.meta.env.VITE_API_TIMEOUT || '30000', 10)
    },
    app: {
      name: import.meta.env.VITE_APP_NAME || 'Event Scheduler',
      version: import.meta.env.VITE_APP_VERSION || '1.0.0',
      environment: (import.meta.env.VITE_APP_ENV || 'development') as AppConfig['app']['environment']
    },
    features: {
      debugMode: import.meta.env.VITE_DEBUG_MODE === 'true' || import.meta.env.DEV
    }
  }
}

export const config: Readonly<AppConfig> = Object.freeze(createConfig())

// Helper functions for common checks
export const isDevelopment = () => config.app.environment === 'development'
export const isProduction = () => config.app.environment === 'production'
export const isStaging = () => config.app.environment === 'staging'
export const isDebugMode = () => config.features.debugMode

export type { AppConfig }