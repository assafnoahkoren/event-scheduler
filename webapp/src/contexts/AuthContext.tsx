import { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import { trpc } from '@/utils/trpc'
import type { inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from '../../../server/src/routers/appRouter'
import { useTranslation } from 'react-i18next'

type RouterOutput = inferRouterOutputs<AppRouter>
type User = RouterOutput['auth']['me']['user']

interface AuthContextType {
  user: User | null
  isLoading: boolean
  accessToken: string | null
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshAuth: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation()
  const [user, setUser] = useState<User | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(() => {
    // Check localStorage for token on initial load
    const storedToken = localStorage.getItem('accessToken')
    return storedToken || null
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const utils = trpc.useUtils()
  const loginMutation = trpc.auth.login.useMutation()
  const registerMutation = trpc.auth.register.useMutation()
  const logoutMutation = trpc.auth.logout.useMutation()
  const refreshMutation = trpc.auth.refresh.useMutation()

  // Query for getting current user - only enabled when we have a token and not logging out
  const meQuery = trpc.auth.me.useQuery(undefined, {
    enabled: !!accessToken && !isLoggingOut,
    retry: false,
  })

  // Handle meQuery results and set user language
  useEffect(() => {
    if (meQuery.data) {
      setUser(meQuery.data.user)
      setIsLoading(false)

      // Set language from user preferences if available
      if (meQuery.data.user?.language) {
        const userLang = meQuery.data.user.language
        i18n.changeLanguage(userLang)

        // Set the direction for RTL languages
        const dir = userLang === 'ar' || userLang === 'he' ? 'rtl' : 'ltr'
        document.documentElement.dir = dir
        document.documentElement.lang = userLang

        // Remove localStorage language preference as we're using DB now
        localStorage.removeItem('i18nextLng')
      }
    } else if (meQuery.error && accessToken) {
      // Token is invalid
      localStorage.removeItem('accessToken')
      setAccessToken(null)
      setUser(null)
      setIsLoading(false)
    }
  }, [meQuery.data, meQuery.error, accessToken, i18n])

  useEffect(() => {
    // If we have a token, the meQuery will handle loading the user
    // If not, we're done loading
    if (!accessToken) {
      setIsLoading(false)
    } else if (accessToken && !meQuery.isLoading) {
      setIsLoading(false)
    }
  }, [accessToken, meQuery.isLoading])

  const login = async (email: string, password: string) => {
    const result = await loginMutation.mutateAsync({ email, password })
    setUser(result.user)
    setAccessToken(result.accessToken)
    localStorage.setItem('accessToken', result.accessToken)

    // Set language from user preferences if available
    if (result.user?.language) {
      const userLang = result.user.language
      i18n.changeLanguage(userLang)

      // Set the direction for RTL languages
      const dir = userLang === 'ar' || userLang === 'he' ? 'rtl' : 'ltr'
      document.documentElement.dir = dir
      document.documentElement.lang = userLang

      // Remove localStorage language preference as we're using DB now
      localStorage.removeItem('i18nextLng')
    }

    setIsLoading(false) // Ensure loading is false after login
    await utils.invalidate()
  }

  const register = async (email: string, password: string) => {
    // Pass the current UI language when registering
    // Ensure we only send the base language code (en, he, ar)
    const currentLang = i18n.language.split('-')[0] // Handle cases like 'en-US'
    const validLang = ['en', 'he', 'ar'].includes(currentLang) ? currentLang : 'en'

    const result = await registerMutation.mutateAsync({
      email,
      password,
      language: validLang as 'en' | 'he' | 'ar'
    })
    setUser(result.user)
    setAccessToken(result.accessToken)
    localStorage.setItem('accessToken', result.accessToken)

    // Set language from user preferences if available (or use current UI language for new users)
    const userLang = result.user?.language || i18n.language
    i18n.changeLanguage(userLang)

    // Set the direction for RTL languages
    const dir = userLang === 'ar' || userLang === 'he' ? 'rtl' : 'ltr'
    document.documentElement.dir = dir
    document.documentElement.lang = userLang

    // Remove localStorage language preference as we're using DB now
    localStorage.removeItem('i18nextLng')

    setIsLoading(false) // Ensure loading is false after register
    await utils.invalidate()
  }

  const logout = async () => {
    // Set logging out flag to prevent queries
    setIsLoggingOut(true)

    // Store token before clearing
    const token = accessToken

    // Clear all local storage first to ensure it's gone before reload
    localStorage.removeItem('accessToken')
    localStorage.removeItem('currentSiteId')

    // Clear state
    setUser(null)
    setAccessToken(null)

    // Try to logout on the server (don't await to avoid delays)
    if (token) {
      logoutMutation.mutate(undefined, {
        onError: (error) => {
          console.error('Logout error:', error)
        }
      })
    }

    // Small delay to ensure localStorage is cleared before navigation
    setTimeout(() => {
      window.location.href = '/login'
    }, 100)
  }

  const refreshAuth = async () => {
    try {
      // Refresh only returns new tokens, not user data
      // In a real app, you might want to fetch user data after refreshing
      await refreshMutation.mutateAsync()
    } catch {
      setUser(null)
    }
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, accessToken, login, register, logout, refreshAuth }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}