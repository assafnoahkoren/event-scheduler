import { type ReactNode } from 'react'
import { AuthProvider } from '@/contexts/AuthContext'
import { CurrentOrgProvider } from '@/contexts/CurrentOrgContext'
import { CurrentSiteProvider } from '@/contexts/CurrentSiteContext'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { Toaster } from 'sonner'

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
        <CurrentOrgProvider>
          <CurrentSiteProvider>
            {children}
            <Toaster position="top-center" richColors closeButton />
          </CurrentSiteProvider>
        </CurrentOrgProvider>
      </LanguageProvider>
    </AuthProvider>
  )
}