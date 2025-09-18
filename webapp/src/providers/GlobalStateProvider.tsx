import { type ReactNode } from 'react'
import { AuthProvider } from '@/contexts/AuthContext'
import { CurrentSiteProvider } from '@/contexts/CurrentSiteContext'
import { LanguageProvider } from '@/contexts/LanguageContext'

interface GlobalStateProviderProps {
  children: ReactNode
}

/**
 * GlobalStateProvider wraps all context providers in the application
 * This centralizes state management and ensures proper provider hierarchy
 */
export function GlobalStateProvider({ children }: GlobalStateProviderProps) {
  return (
    <AuthProvider>
      <LanguageProvider>
        <CurrentSiteProvider>
          {children}
        </CurrentSiteProvider>
      </LanguageProvider>
    </AuthProvider>
  )
}