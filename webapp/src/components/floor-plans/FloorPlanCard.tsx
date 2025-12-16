import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { ChevronRight, Image, Layers, Loader2 } from 'lucide-react'
import type { inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from '@/../../server/src/routers/appRouter'
import { useSignedUrl } from '@/hooks/useSignedUrl'

type RouterOutput = inferRouterOutputs<AppRouter>
type FloorPlan = RouterOutput['floorPlans']['siteFloorPlans']['list'][0]

interface FloorPlanCardProps {
  floorPlan: FloorPlan
  onEdit: (floorPlan: FloorPlan) => void
}

export function FloorPlanCard({ floorPlan, onEdit }: FloorPlanCardProps) {
  const { t } = useTranslation()

  const templateCount = floorPlan.templates?.length ?? 0
  const hasImage = !!floorPlan.imageFile
  const isCalibrated = !!floorPlan.pixelsPerMeter

  const { signedUrl, isLoading: isLoadingImage } = useSignedUrl({
    fileId: floorPlan.imageFile?.id,
  })

  return (
    <div
      className="flex items-center gap-4 p-4 hover:bg-muted/50 cursor-pointer transition-colors"
      onClick={() => onEdit(floorPlan)}
    >
      {/* Thumbnail or placeholder */}
      <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
        {hasImage ? (
          isLoadingImage ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : signedUrl ? (
            <img
              src={signedUrl}
              alt={floorPlan.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <Image className="h-6 w-6 text-muted-foreground" />
          )
        ) : (
          <Image className="h-6 w-6 text-muted-foreground" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h3 className="font-medium truncate">{floorPlan.name}</h3>
        <div className="flex items-center gap-2 mt-1">
          {/* Template count */}
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Layers className="h-3.5 w-3.5" />
            <span>{templateCount} {t('floorPlans.templates')}</span>
          </div>

          {/* Calibration status */}
          <Badge variant={isCalibrated ? 'default' : 'secondary'} className="text-xs">
            {isCalibrated ? t('floorPlans.calibrated') : t('floorPlans.notCalibrated')}
          </Badge>
        </div>
      </div>

      {/* Arrow */}
      <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0 rtl:rotate-180" />
    </div>
  )
}
