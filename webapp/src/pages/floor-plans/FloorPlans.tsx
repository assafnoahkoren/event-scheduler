import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { trpc } from '@/utils/trpc'
import { skipToken } from '@tanstack/react-query'
import { useCurrentSite } from '@/contexts/CurrentSiteContext'
import { FloorPlanCard } from '@/components/floor-plans/FloorPlanCard'
import { CreateFloorPlanDialog } from '@/components/floor-plans/CreateFloorPlanDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Search, Map } from 'lucide-react'
import type { inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from '@/../../server/src/routers/appRouter'

type RouterOutput = inferRouterOutputs<AppRouter>
type FloorPlan = RouterOutput['floorPlans']['siteFloorPlans']['list'][0]

export function FloorPlans() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { currentSite } = useCurrentSite()
  const [searchQuery, setSearchQuery] = useState('')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  const { data: floorPlans, isLoading, error } = trpc.floorPlans.siteFloorPlans.list.useQuery(
    currentSite ? { siteId: currentSite.id } : skipToken
  )

  const handleEdit = (floorPlan: FloorPlan) => {
    navigate(`/floor-plans/${floorPlan.id}`)
  }

  const filteredFloorPlans = floorPlans?.filter((floorPlan) =>
    floorPlan.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (error) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <p className="text-muted-foreground">{t('common.error')}</p>
          <p className="text-sm text-red-600 mt-2">{error.message}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-4 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold">{t('floorPlans.title')}</h1>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 me-2" />
            {t('floorPlans.newFloorPlan')}
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder={t('floorPlans.searchFloorPlans')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="ps-9"
          />
        </div>
      </div>

      {/* Floor Plans List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="text-muted-foreground">{t('common.loading')}</div>
        </div>
      ) : filteredFloorPlans?.length === 0 ? (
        <div className="text-center py-16">
          <Map className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            {searchQuery ? t('floorPlans.noFloorPlansFound') : t('floorPlans.noFloorPlans')}
          </h3>
          <p className="text-sm text-muted-foreground mb-6">
            {searchQuery ? t('floorPlans.tryAdjustingSearch') : t('floorPlans.noFloorPlansDescription')}
          </p>
          {!searchQuery && (
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 me-2" />
              {t('floorPlans.createFloorPlan')}
            </Button>
          )}
        </div>
      ) : (
        <div className="divide-y rounded-lg border">
          {filteredFloorPlans?.map((floorPlan) => (
            <FloorPlanCard
              key={floorPlan.id}
              floorPlan={floorPlan}
              onEdit={handleEdit}
            />
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <CreateFloorPlanDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
    </div>
  )
}
