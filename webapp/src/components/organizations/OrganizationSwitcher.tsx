import { Building2 } from 'lucide-react'
import { useCurrentOrg } from '@/contexts/CurrentOrgContext'

export function OrganizationSwitcher() {
  const { currentOrg } = useCurrentOrg()

  if (!currentOrg) {
    return null
  }

  return (
    <div className="flex items-center gap-2 px-2 py-2">
      <Building2 className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm font-medium">{currentOrg.name}</span>
    </div>
  )
}
