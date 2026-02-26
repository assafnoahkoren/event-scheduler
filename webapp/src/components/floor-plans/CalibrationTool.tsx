import { useState, useRef, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Ruler, RotateCcw, Check, X, Loader2, ZoomIn, ZoomOut, Move } from 'lucide-react'
import { trpc } from '@/utils/trpc'
import { toast } from 'sonner'

interface Point {
  x: number
  y: number
}

interface CalibrationToolProps {
  floorPlanId: string
  imageUrl: string
  currentPixelsPerMeter: number | null
  onCalibrated: () => void
}

export function CalibrationTool({
  floorPlanId,
  imageUrl,
  currentPixelsPerMeter,
  onCalibrated,
}: CalibrationToolProps) {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const [point1, setPoint1] = useState<Point | null>(null)
  const [point2, setPoint2] = useState<Point | null>(null)
  const [realDistance, setRealDistance] = useState('')
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 })
  const [imageNaturalSize, setImageNaturalSize] = useState({ width: 0, height: 0 })
  const [baseScale, setBaseScale] = useState(1) // Scale to fit image in viewport
  const [imageLoaded, setImageLoaded] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [lastPanPoint, setLastPanPoint] = useState<Point | null>(null)
  const [didPan, setDidPan] = useState(false) // Track if we actually panned during this mouse down
  const [isAltPressed, setIsAltPressed] = useState(false) // Track Alt key state for cursor
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const utils = trpc.useUtils()

  const calibrateMutation = trpc.floorPlans.siteFloorPlans.calibrate.useMutation({
    onSuccess: () => {
      toast.success(t('floorPlans.calibrationSuccess'))
      utils.floorPlans.siteFloorPlans.get.invalidate({ id: floorPlanId })
      utils.floorPlans.siteFloorPlans.list.invalidate()
      setIsOpen(false)
      onCalibrated()
    },
    onError: (error) => {
      toast.error(t('floorPlans.calibrationError'), { description: error.message })
    },
  })

  // Calculate pixel distance between two points
  const pixelDistance = point1 && point2
    ? Math.sqrt(Math.pow(point2.x - point1.x, 2) + Math.pow(point2.y - point1.y, 2))
    : 0

  // Calculate pixels per meter
  const calculatedPixelsPerMeter = pixelDistance && realDistance
    ? pixelDistance / parseFloat(realDistance)
    : 0

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const image = imageRef.current
    if (!canvas || !image || !imageLoaded) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Save the context state
    ctx.save()

    // Combined scale: baseScale (fit to viewport) * zoom (user zoom)
    const totalScale = baseScale * zoom

    // Apply pan and combined scale transformations
    ctx.translate(pan.x, pan.y)
    ctx.scale(totalScale, totalScale)

    // Draw image at its natural size (scaling is handled by the transform)
    ctx.drawImage(image, 0, 0, imageNaturalSize.width, imageNaturalSize.height)

    // Draw points and line (scale-adjusted for consistent visual size)
    const pointRadius = 8 / totalScale
    const lineWidth = 2 / totalScale
    const thickLineWidth = 3 / totalScale

    if (point1) {
      ctx.beginPath()
      ctx.arc(point1.x, point1.y, pointRadius, 0, 2 * Math.PI)
      ctx.fillStyle = '#ef4444'
      ctx.fill()
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = lineWidth
      ctx.stroke()
    }

    if (point2) {
      ctx.beginPath()
      ctx.arc(point2.x, point2.y, pointRadius, 0, 2 * Math.PI)
      ctx.fillStyle = '#22c55e'
      ctx.fill()
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = lineWidth
      ctx.stroke()
    }

    if (point1 && point2) {
      ctx.beginPath()
      ctx.moveTo(point1.x, point1.y)
      ctx.lineTo(point2.x, point2.y)
      ctx.strokeStyle = '#3b82f6'
      ctx.lineWidth = thickLineWidth
      ctx.stroke()

      // Draw distance label
      const midX = (point1.x + point2.x) / 2
      const midY = (point1.y + point2.y) / 2
      const distText = `${Math.round(pixelDistance)}px`

      const fontSize = 14 / totalScale
      ctx.font = `${fontSize}px sans-serif`
      ctx.fillStyle = '#3b82f6'
      ctx.textAlign = 'center'

      // Background for text
      const metrics = ctx.measureText(distText)
      const padding = 4 / totalScale
      const textHeight = 20 / totalScale
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
      ctx.fillRect(midX - metrics.width / 2 - padding, midY - textHeight + 2 / totalScale, metrics.width + padding * 2, textHeight)

      ctx.fillStyle = '#3b82f6'
      ctx.fillText(distText, midX, midY - 4 / totalScale)
    }

    // Restore the context state
    ctx.restore()
  }, [point1, point2, pixelDistance, imageLoaded, zoom, pan, baseScale, imageNaturalSize])

  // Draw canvas when image is loaded or points change
  useEffect(() => {
    if (imageLoaded && viewportSize.width > 0) {
      // Small delay to ensure canvas is mounted
      requestAnimationFrame(() => {
        drawCanvas()
      })
    }
  }, [drawCanvas, imageLoaded, viewportSize])

  // Track Alt key state for cursor changes
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Alt') {
        setIsAltPressed(true)
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Alt') {
        setIsAltPressed(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [isOpen])

  const handleImageLoad = () => {
    const image = imageRef.current
    const container = containerRef.current
    if (!image || !container) return

    // Store the natural image size (actual pixels in the image)
    setImageNaturalSize({ width: image.naturalWidth, height: image.naturalHeight })

    // Use full container width, with a max height
    const containerWidth = container.clientWidth || 600
    const maxHeight = 500

    // Calculate aspect ratio to determine height
    const aspectRatio = image.naturalHeight / image.naturalWidth
    const calculatedHeight = Math.min(containerWidth * aspectRatio, maxHeight)

    // Viewport is the full container width
    const viewportWidth = containerWidth
    const viewportHeight = calculatedHeight

    // Base scale to fit image in viewport
    const scale = Math.min(viewportWidth / image.naturalWidth, viewportHeight / image.naturalHeight)

    setViewportSize({ width: viewportWidth, height: viewportHeight })
    setBaseScale(scale)
    setImageLoaded(true)
  }

  // Convert screen coordinates to image coordinates (accounting for zoom and pan)
  const screenToImageCoords = (screenX: number, screenY: number): Point => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    const canvasX = screenX - rect.left
    const canvasY = screenY - rect.top

    // Reverse the transformations: combined scale = baseScale * zoom
    const totalScale = baseScale * zoom
    const imageX = (canvasX - pan.x) / totalScale
    const imageY = (canvasY - pan.y) / totalScale

    return { x: imageX, y: imageY }
  }

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // Don't place points if we were panning or if alt key is held
    if (didPan || e.altKey) {
      setDidPan(false)
      return
    }

    const { x, y } = screenToImageCoords(e.clientX, e.clientY)

    // Ensure the point is within the image bounds (using natural image size)
    if (x < 0 || y < 0 || x > imageNaturalSize.width || y > imageNaturalSize.height) return

    if (!point1) {
      setPoint1({ x, y })
    } else if (!point2) {
      setPoint2({ x, y })
    } else {
      // Reset and start new measurement
      setPoint1({ x, y })
      setPoint2(null)
    }
  }

  // Helper to constrain pan after zoom (needs to be defined before zoom handlers)
  const getConstrainedPanAfterZoom = (newPan: Point, newZoom: number): Point => {
    const totalScale = baseScale * newZoom
    const scaledImageWidth = imageNaturalSize.width * totalScale
    const scaledImageHeight = imageNaturalSize.height * totalScale
    const margin = 50

    let constrainedX = newPan.x
    let constrainedY = newPan.y

    if (scaledImageWidth <= viewportSize.width) {
      constrainedX = (viewportSize.width - scaledImageWidth) / 2
    } else {
      const minX = viewportSize.width - scaledImageWidth - margin
      const maxX = margin
      constrainedX = Math.max(minX, Math.min(maxX, newPan.x))
    }

    if (scaledImageHeight <= viewportSize.height) {
      constrainedY = (viewportSize.height - scaledImageHeight) / 2
    } else {
      const minY = viewportSize.height - scaledImageHeight - margin
      const maxY = margin
      constrainedY = Math.max(minY, Math.min(maxY, newPan.y))
    }

    return { x: constrainedX, y: constrainedY }
  }

  // Zoom handlers - zoom towards center of viewport
  const handleZoomIn = () => {
    const newZoom = zoom * 1.25
    const zoomRatio = newZoom / zoom
    const centerX = viewportSize.width / 2
    const centerY = viewportSize.height / 2
    const newPanX = centerX - (centerX - pan.x) * zoomRatio
    const newPanY = centerY - (centerY - pan.y) * zoomRatio
    const constrainedPan = getConstrainedPanAfterZoom({ x: newPanX, y: newPanY }, newZoom)
    setZoom(newZoom)
    setPan(constrainedPan)
  }

  const handleZoomOut = () => {
    const newZoom = Math.max(zoom / 1.25, 0.5)
    const zoomRatio = newZoom / zoom
    const centerX = viewportSize.width / 2
    const centerY = viewportSize.height / 2
    const newPanX = centerX - (centerX - pan.x) * zoomRatio
    const newPanY = centerY - (centerY - pan.y) * zoomRatio
    const constrainedPan = getConstrainedPanAfterZoom({ x: newPanX, y: newPanY }, newZoom)
    setZoom(newZoom)
    setPan(constrainedPan)
  }

  const handleResetZoom = () => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    const newZoom = Math.max(0.5, zoom * delta)

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    const zoomRatio = newZoom / zoom
    const newPanX = mouseX - (mouseX - pan.x) * zoomRatio
    const newPanY = mouseY - (mouseY - pan.y) * zoomRatio
    const constrainedPan = getConstrainedPanAfterZoom({ x: newPanX, y: newPanY }, newZoom)

    setZoom(newZoom)
    setPan(constrainedPan)
  }

  // Constrain pan to keep image within viewport bounds
  const constrainPan = useCallback((newPan: Point, currentZoom: number): Point => {
    const totalScale = baseScale * currentZoom
    const scaledImageWidth = imageNaturalSize.width * totalScale
    const scaledImageHeight = imageNaturalSize.height * totalScale

    // Calculate min/max pan values to keep image within bounds
    // Allow some margin to pan slightly beyond edges
    const margin = 50

    let constrainedX = newPan.x
    let constrainedY = newPan.y

    // If image is smaller than viewport, center it
    if (scaledImageWidth <= viewportSize.width) {
      constrainedX = (viewportSize.width - scaledImageWidth) / 2
    } else {
      // Image is larger than viewport - constrain pan
      const minX = viewportSize.width - scaledImageWidth - margin
      const maxX = margin
      constrainedX = Math.max(minX, Math.min(maxX, newPan.x))
    }

    if (scaledImageHeight <= viewportSize.height) {
      constrainedY = (viewportSize.height - scaledImageHeight) / 2
    } else {
      const minY = viewportSize.height - scaledImageHeight - margin
      const maxY = margin
      constrainedY = Math.max(minY, Math.min(maxY, newPan.y))
    }

    return { x: constrainedX, y: constrainedY }
  }, [baseScale, imageNaturalSize, viewportSize])

  // Pan handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      // Middle mouse button or Alt+left click for panning
      e.preventDefault()
      setIsPanning(true)
      setDidPan(false) // Reset didPan at start
      setLastPanPoint({ x: e.clientX, y: e.clientY })
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanning && lastPanPoint) {
      const deltaX = e.clientX - lastPanPoint.x
      const deltaY = e.clientY - lastPanPoint.y

      // Only mark as panned if we actually moved
      if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
        setDidPan(true)
      }

      const newPan = { x: pan.x + deltaX, y: pan.y + deltaY }
      setPan(constrainPan(newPan, zoom))
      setLastPanPoint({ x: e.clientX, y: e.clientY })
    }
  }

  const handleMouseUp = () => {
    setIsPanning(false)
    setLastPanPoint(null)
    // didPan will be checked and reset in handleCanvasClick
  }

  const handleMouseLeave = () => {
    setIsPanning(false)
    setLastPanPoint(null)
    setDidPan(false)
  }

  const handleReset = () => {
    setPoint1(null)
    setPoint2(null)
    setRealDistance('')
  }

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (!open) {
      // Reset state when closing
      setPoint1(null)
      setPoint2(null)
      setRealDistance('')
      setImageLoaded(false)
      setViewportSize({ width: 0, height: 0 })
      setImageNaturalSize({ width: 0, height: 0 })
      setBaseScale(1)
      setZoom(1)
      setPan({ x: 0, y: 0 })
    }
  }

  const handleCalibrate = () => {
    if (!calculatedPixelsPerMeter || calculatedPixelsPerMeter <= 0) return

    calibrateMutation.mutate({
      id: floorPlanId,
      pixelsPerMeter: calculatedPixelsPerMeter,
    })
  }

  const canCalibrate = point1 && point2 && realDistance && parseFloat(realDistance) > 0

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
      >
        <Ruler className="h-4 w-4 me-2" />
        {currentPixelsPerMeter ? t('floorPlans.recalibrate') : t('floorPlans.calibrate')}
      </Button>

      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t('floorPlans.calibrationTitle')}</DialogTitle>
            <DialogDescription>
              {t('floorPlans.calibrationDescription')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Instructions */}
            <div className="text-sm text-muted-foreground">
              <p>{t('floorPlans.calibrationInstructions')}</p>
            </div>

            {/* Canvas area */}
            <div ref={containerRef} className="relative border rounded-lg overflow-hidden bg-muted min-h-[200px]">
              <img
                ref={imageRef}
                src={imageUrl}
                alt="Floor plan"
                onLoad={handleImageLoad}
                className="hidden"
              />
              {!imageLoaded && (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              )}
              {viewportSize.width > 0 && imageLoaded && (
                <canvas
                  ref={canvasRef}
                  width={viewportSize.width}
                  height={viewportSize.height}
                  onClick={handleCanvasClick}
                  onWheel={handleWheel}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseLeave}
                  className={`w-full ${isPanning ? 'cursor-grabbing' : isAltPressed ? 'cursor-grab' : 'cursor-crosshair'}`}
                  style={{ height: viewportSize.height }}
                />
              )}
              {/* Zoom controls */}
              {imageLoaded && (
                <div className="absolute top-2 left-1/2 -translate-x-1/2 flex flex-row items-center gap-1 bg-background/80 rounded-lg p-1 shadow-sm">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleZoomOut}
                    title={t('common.zoomOut')}
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <div className="text-xs text-center text-muted-foreground px-2 min-w-[3rem]">
                    {Math.round(zoom * 100)}%
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleZoomIn}
                    title={t('common.zoomIn')}
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                  <div className="w-px h-6 bg-border mx-1" />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleResetZoom}
                    title={t('common.resetZoom')}
                  >
                    <Move className="h-4 w-4" />
                  </Button>
                </div>
              )}
              {/* Pan hint */}
              {imageLoaded && (
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-muted-foreground bg-background/80 rounded px-2 py-1">
                  {t('floorPlans.panHint')}
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="flex items-end gap-4">
              <div className="flex-1 space-y-2">
                <Label htmlFor="realDistance">{t('floorPlans.realDistance')}</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="realDistance"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={realDistance}
                    onChange={(e) => setRealDistance(e.target.value)}
                    placeholder="0.00"
                    disabled={!point1 || !point2}
                  />
                  <span className="text-sm text-muted-foreground">{t('floorPlans.meters')}</span>
                </div>
              </div>

              <Button variant="outline" onClick={handleReset}>
                <RotateCcw className="h-4 w-4 me-2" />
                {t('common.reset')}
              </Button>
            </div>

            {/* Result */}
            {canCalibrate && (
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{t('floorPlans.calculatedScale')}</p>
                    <p className="text-2xl font-bold">
                      {calculatedPixelsPerMeter.toFixed(2)} {t('floorPlans.pixelsPerMeterUnit')}
                    </p>
                  </div>
                  <Check className="h-8 w-8 text-green-500" />
                </div>
              </div>
            )}

            {currentPixelsPerMeter && (
              <div className="text-sm text-muted-foreground">
                {t('floorPlans.currentCalibration')}: {currentPixelsPerMeter.toFixed(2)} {t('floorPlans.pixelsPerMeterUnit')}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              <X className="h-4 w-4 me-2" />
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleCalibrate}
              disabled={!canCalibrate || calibrateMutation.isPending}
            >
              <Ruler className="h-4 w-4 me-2" />
              {calibrateMutation.isPending ? t('common.saving') : t('floorPlans.applyCalibration')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
