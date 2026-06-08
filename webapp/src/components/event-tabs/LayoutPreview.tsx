import { useEffect, useRef, useState } from 'react'
import type { inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from '@/../../server/src/routers/appRouter'
import { useSignedUrl } from '@/hooks/useSignedUrl'
import { Loader2 } from 'lucide-react'

type RouterOutput = inferRouterOutputs<AppRouter>
type EventLayout = RouterOutput['floorPlans']['eventLayouts']['list'][number]

interface LayoutPreviewProps {
  layout: EventLayout
  onClick?: () => void
}

/**
 * Read-only render of an event's floor plan layout: the calibrated floor plan
 * image with its components positioned on top. No pan/zoom/drag — a glanceable
 * preview shown in the event's Floor Plan tab. Components are placed using the
 * same meters -> displayed-pixels mapping as the editor: a component at
 * xInMeters sits at xInMeters * pixelsPerMeter on the natural image, scaled by
 * the ratio between the rendered and natural image widths.
 */
export function LayoutPreview({ layout, onClick }: LayoutPreviewProps) {
  const { signedUrl } = useSignedUrl({ fileId: layout.floorPlan?.imageFile?.id })
  const imgRef = useRef<HTMLImageElement>(null)
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null)
  const [renderedWidth, setRenderedWidth] = useState(0)

  // Keep the rendered width in sync as the card resizes (so positions stay
  // aligned with the image at any container width).
  useEffect(() => {
    const img = imgRef.current
    if (!img) return
    const update = () => setRenderedWidth(img.offsetWidth)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(img)
    return () => ro.disconnect()
  }, [signedUrl])

  const pixelsPerMeter = layout.floorPlan?.pixelsPerMeter ?? 100
  const scale = naturalSize && renderedWidth ? renderedWidth / naturalSize.width : 1
  const metersToPixels = (meters: number) => meters * pixelsPerMeter * scale

  if (!layout.floorPlan?.imageFile?.id) {
    return (
      <div className="w-full rounded-lg border bg-muted/30 py-12 text-center text-sm text-muted-foreground">
        {layout.name}
      </div>
    )
  }

  if (!signedUrl) {
    return (
      <div className="flex w-full items-center justify-center rounded-lg border bg-muted/30 py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const positioned = naturalSize && renderedWidth > 0

  return (
    <button
      type="button"
      onClick={onClick}
      className="relative block w-full overflow-hidden rounded-lg border bg-muted/30"
    >
      <img
        ref={imgRef}
        src={signedUrl}
        alt={layout.name ?? ''}
        className="block h-auto w-full select-none"
        draggable={false}
        onLoad={(e) => {
          const img = e.currentTarget
          setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight })
          setRenderedWidth(img.offsetWidth)
        }}
      />

      {positioned &&
        layout.components.map((component) => {
          const x = metersToPixels(component.xInMeters)
          const y = metersToPixels(component.yInMeters)
          const width = metersToPixels(component.widthInMeters)
          const height = metersToPixels(component.heightInMeters)
          return (
            <div
              key={component.id}
              className="absolute"
              style={{
                left: x,
                top: y,
                width,
                height,
                transform: `translate(-50%, -50%) rotate(${component.rotation}deg)`,
              }}
            >
              <div
                className="h-full w-full"
                style={{
                  backgroundColor: component.componentType?.color || '#E5E7EB',
                  borderRadius: component.componentType?.borderRadius
                    ? `${component.componentType.borderRadius}px`
                    : '4px',
                  opacity: 0.85,
                }}
              />
            </div>
          )
        })}
    </button>
  )
}
