import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { trpc } from '@/utils/trpc'
import type { inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from '../../../server/src/routers/appRouter'

type RouterOutput = inferRouterOutputs<AppRouter>
type Site = RouterOutput['sites']['list'][0]

interface CurrentSiteContextType {
  currentSite: Site | null
  setCurrentSite: (site: Site | null) => void
  sites: Site[]
  isLoading: boolean
  switchSite: (siteId: string) => void
}

const CurrentSiteContext = createContext<CurrentSiteContextType | undefined>(undefined)

interface CurrentSiteProviderProps {
  children: ReactNode
}

export function CurrentSiteProvider({ children }: CurrentSiteProviderProps) {
  const [currentSite, setCurrentSite] = useState<Site | null>(null)

  // Fetch all user's sites
  const { data: sites, isLoading } = trpc.sites.list.useQuery()

  // Set the first site as current when sites are loaded
  useEffect(() => {
    if (sites && sites.length > 0 && !currentSite) {
      // Try to load saved site from localStorage
      const savedSiteId = localStorage.getItem('currentSiteId')
      const savedSite = sites.find(site => site.id === savedSiteId)

      if (savedSite) {
        setCurrentSite(savedSite)
      } else {
        // Default to first site
        setCurrentSite(sites[0])
        localStorage.setItem('currentSiteId', sites[0].id)
      }
    }
  }, [sites, currentSite])

  // Update localStorage when current site changes
  useEffect(() => {
    if (currentSite) {
      localStorage.setItem('currentSiteId', currentSite.id)
    } else {
      localStorage.removeItem('currentSiteId')
    }
  }, [currentSite])

  const switchSite = (siteId: string) => {
    const site = sites?.find(s => s.id === siteId)
    if (site) {
      setCurrentSite(site)
    }
  }

  const value: CurrentSiteContextType = {
    currentSite,
    setCurrentSite,
    sites: sites || [],
    isLoading,
    switchSite
  }

  return (
    <CurrentSiteContext.Provider value={value}>
      {children}
    </CurrentSiteContext.Provider>
  )
}

export function useCurrentSite() {
  const context = useContext(CurrentSiteContext)
  if (context === undefined) {
    throw new Error('useCurrentSite must be used within a CurrentSiteProvider')
  }
  return context
}