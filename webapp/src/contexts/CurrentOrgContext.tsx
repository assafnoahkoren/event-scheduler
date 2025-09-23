import React, { createContext, useContext, useState, useEffect } from 'react'
import { trpc } from '@/utils/trpc'
import type { inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from '../../../server/src/routers/appRouter'

type RouterOutput = inferRouterOutputs<AppRouter>
type Organization = RouterOutput['organizations']['get']

interface CurrentOrgContextType {
  currentOrg: Organization | null
  setCurrentOrg: (org: Organization | null) => void
  isLoading: boolean
}

const CurrentOrgContext = createContext<CurrentOrgContextType | null>(null)

export function CurrentOrgProvider({ children }: { children: React.ReactNode }) {
  const [currentOrg, setCurrentOrgState] = useState<Organization | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Get user's organizations
  const { data: organizations } = trpc.organizations.list.useQuery(undefined, {
    retry: 1,
    refetchOnWindowFocus: false
  })

  // Load saved organization from localStorage or use first available
  useEffect(() => {
    if (organizations && organizations.length > 0) {
      const savedOrgId = localStorage.getItem('currentOrgId')

      if (savedOrgId) {
        // Try to find the saved organization
        const savedOrg = organizations.find(org => org.id === savedOrgId)
        if (savedOrg) {
          // Fetch full org details
          setCurrentOrgState(savedOrg as Organization)
        } else {
          // Saved org not found, use first available
          setCurrentOrgState(organizations[0] as Organization)
          localStorage.setItem('currentOrgId', organizations[0].id)
        }
      } else {
        // No saved org, use first available
        setCurrentOrgState(organizations[0] as Organization)
        localStorage.setItem('currentOrgId', organizations[0].id)
      }
    }
    setIsLoading(false)
  }, [organizations])

  const setCurrentOrg = (org: Organization | null) => {
    setCurrentOrgState(org)
    if (org) {
      localStorage.setItem('currentOrgId', org.id)
    } else {
      localStorage.removeItem('currentOrgId')
    }
  }

  return (
    <CurrentOrgContext.Provider value={{ currentOrg, setCurrentOrg, isLoading }}>
      {children}
    </CurrentOrgContext.Provider>
  )
}

export function useCurrentOrg() {
  const context = useContext(CurrentOrgContext)
  if (!context) {
    throw new Error('useCurrentOrg must be used within a CurrentOrgProvider')
  }
  return context
}