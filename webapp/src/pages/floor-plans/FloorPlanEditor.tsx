import { useState, useRef, useEffect, useLayoutEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { trpc } from '@/utils/trpc'
import { useCurrentOrg } from '@/contexts/CurrentOrgContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  ArrowLeft,
  Plus,
  Minus,
  RotateCcw,
  Save,
  Loader2,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'
import { useSignedUrl } from '@/hooks/useSignedUrl'
import { useIsMobile } from '@/hooks/useIsMobile'
import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer'
import { ComponentTypeFormDialog } from '@/components/floor-plans/ComponentTypeFormDialog'
import { ComponentPalette } from '@/components/floor-plans/ComponentPalette'
import { ComponentPropertiesPanel } from '@/components/floor-plans/ComponentPropertiesPanel'
import { useGesture } from '@use-gesture/react'
import type { inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from '@/../../server/src/routers/appRouter'
import {
  useFloorPlanEditorData,
  type Source,
  type FloorPlanEditorData,
  type FloorPlanEditorComponent,
} from '@/hooks/useFloorPlanEditorData'

type RouterOutput = inferRouterOutputs<AppRouter>
type ComponentType = RouterOutput['floorPlans']['componentTypes']['list'][0]

type PlacedComponent = FloorPlanEditorComponent & {
  isDragging?: boolean
}

// Snap threshold in meters
const SNAP_THRESHOLD_METERS = 0.1

type SnapLine = {
  type: 'horizontal' | 'vertical'
  position: number // in pixels
  // For gap indicators
  isGap?: boolean
  gapStart?: number // in pixels
  gapEnd?: number // in pixels
  gapSizeMeters?: number // gap size in meters for display
}

/**
 * Renders a component label sized to fit its parent box on a single line: it
 * measures the text at a base size and scales the font so the label fits the
 * box's width and height. Labels can get small in tiny components — the canvas
 * zoom makes them readable. Re-fits when the text or the box size changes.
 */
function FitText({ text, boxWidth, boxHeight }: { text: string; boxWidth: number; boxHeight: number }) {
  const ref = useRef<HTMLSpanElement>(null)

  useLayoutEffect(() => {
    const span = ref.current
    if (!span) return
    const BASE = 50
    span.style.fontSize = `${BASE}px`
    const textWidth = span.scrollWidth
    const textHeight = span.scrollHeight
    if (!textWidth || !textHeight) return
    const fit = BASE * Math.min((boxWidth * 0.9) / textWidth, (boxHeight * 0.9) / textHeight)
    span.style.fontSize = `${Math.max(1, fit)}px`
  }, [text, boxWidth, boxHeight])

  return (
    <span ref={ref} className="block whitespace-nowrap leading-none">
      {text}
    </span>
  )
}

interface FloorPlanEditorProps {
  source: Source
  getBackHref: (data: FloorPlanEditorData) => string
}

export function FloorPlanEditor({ source, getBackHref }: FloorPlanEditorProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { currentOrg } = useCurrentOrg()
  const canvasRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)

  // Canvas state
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })

  // Component state
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null)
  const [localComponents, setLocalComponents] = useState<PlacedComponent[]>([])
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // Dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingComponent, setEditingComponent] = useState<PlacedComponent | null>(null)
  const [editForm, setEditForm] = useState({ label: '', rotation: '0' })
  const [componentTypeDialogOpen, setComponentTypeDialogOpen] = useState(false)
  const [editingComponentType, setEditingComponentType] = useState<ComponentType | null>(null)

  // Mobile state
  const isMobile = useIsMobile()
  const [paletteOpen, setPaletteOpen] = useState(false)

  // Snap lines state
  const [snapLines, setSnapLines] = useState<SnapLine[]>([])

  // Image dimensions
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null)
  const [renderedImageSize, setRenderedImageSize] = useState<{ width: number; height: number } | null>(null)

  // Data + mutations, abstracted over template vs event-layout source.
  const editor = useFloorPlanEditorData({
    source,
    callbacks: {
      onComponentAdded: (component) => {
        setLocalComponents(prev => [...prev, component])
        setSelectedComponentId(component.id)
        toast.success(t('templateEditor.componentAdded'))
      },
      onComponentUpdated: () => {
        toast.success(t('templateEditor.componentUpdated'))
        setEditDialogOpen(false)
        setEditingComponent(null)
      },
      onComponentDeleted: (id) => {
        setLocalComponents(prev => prev.filter(c => c.id !== id))
        setSelectedComponentId(prev => (prev === id ? null : prev))
        toast.success(t('templateEditor.componentDeleted'))
      },
      onBulkUpdated: () => {
        setHasUnsavedChanges(false)
      },
      onError: (op, message) => {
        const msg =
          op === 'add' ? t('templateEditor.componentAddError') :
          op === 'delete' ? t('templateEditor.componentDeleteError') :
          op === 'bulk' ? t('templateEditor.saveError') :
          t('templateEditor.componentUpdateError')
        toast.error(msg, { description: message })
      },
    },
  })
  const { data, isLoading } = editor

  // Fetch component types for the sidebar
  const { data: componentTypes } = trpc.floorPlans.componentTypes.list.useQuery(
    { organizationId: currentOrg?.id || '' },
    { enabled: !!currentOrg?.id }
  )

  // Get signed URL for floor plan image
  const { signedUrl: imageUrl } = useSignedUrl({
    fileId: data?.floorPlan?.imageFile?.id,
  })

  // Initialize local components from the loaded source
  useEffect(() => {
    if (data?.components) {
      setLocalComponents(data.components)
    }
  }, [data?.components])

  // Delete key removes the selected component (desktop convenience). A ref keeps
  // the handler fresh without re-subscribing the listener every render (the
  // editor's mutation objects change identity each render).
  const deleteSelectedRef = useRef<() => void>(() => {})
  deleteSelectedRef.current = () => {
    if (selectedComponentId) editor.deleteComponent({ id: selectedComponentId })
  }
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete') deleteSelectedRef.current()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  // Keep renderedImageSize in sync as the image rescales responsively (viewport /
  // container resize, device rotation). A stale renderedImageSize makes dpiScale —
  // and therefore every component's position and size — drift out of alignment
  // with the image. ResizeObserver reports the layout box (unaffected by the
  // zoom CSS transform), so zooming does not trigger spurious updates.
  useEffect(() => {
    const img = imageRef.current
    if (!img) return
    const update = () => {
      if (img.offsetWidth > 0) {
        setRenderedImageSize({ width: img.offsetWidth, height: img.offsetHeight })
      }
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(img)
    return () => ro.disconnect()
  }, [imageUrl])

  // Calculate DPI scale factor (how much the browser scales down the image due to DPI metadata)
  const dpiScale = useMemo(() => {
    if (!imageSize || !renderedImageSize) return 1
    // If natural size > rendered size, browser is scaling down due to DPI
    return renderedImageSize.width / imageSize.width
  }, [imageSize, renderedImageSize])

  // Convert pixel coordinates to meters (accounting for DPI scaling)
  // Input pixels are in "displayed" space, need to convert to "natural" space first
  const pixelsToMeters = useCallback((pixels: number) => {
    if (!data?.floorPlan?.pixelsPerMeter) return pixels / 100
    // Divide by dpiScale to convert from displayed pixels to natural pixels
    return (pixels / dpiScale) / data.floorPlan.pixelsPerMeter
  }, [data?.floorPlan?.pixelsPerMeter, dpiScale])

  // Convert meters to pixels (accounting for DPI scaling)
  // Output is in "displayed" space
  const metersToPixels = useCallback((meters: number) => {
    if (!data?.floorPlan?.pixelsPerMeter) return meters * 100
    // Scale down by DPI factor so components match the displayed image size
    return meters * data.floorPlan.pixelsPerMeter * dpiScale
  }, [data?.floorPlan?.pixelsPerMeter, dpiScale])

  // Zoom to center of viewport
  const zoomToCenter = useCallback((newZoom: number) => {
    if (!containerRef.current) {
      setZoom(newZoom)
      return
    }
    const container = containerRef.current
    const rect = container.getBoundingClientRect()
    const centerX = rect.width / 2
    const centerY = rect.height / 2

    // Calculate the point in canvas space that's currently at the center
    const canvasX = (centerX - pan.x) / zoom
    const canvasY = (centerY - pan.y) / zoom

    // After zoom, we want the same canvas point to be at the center
    const newPanX = centerX - canvasX * newZoom
    const newPanY = centerY - canvasY * newZoom

    setZoom(newZoom)
    setPan({ x: newPanX, y: newPanY })
  }, [zoom, pan])

  // Handle zoom
  const handleZoomIn = () => zoomToCenter(zoom * 1.25)
  const handleZoomOut = () => zoomToCenter(Math.max(0.1, zoom / 1.25))
  const handleResetZoom = () => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }

  // Handle wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      const delta = e.deltaY > 0 ? 0.9 : 1.1
      const newZoom = Math.max(0.1, zoom * delta)

      if (!containerRef.current) {
        setZoom(newZoom)
        return
      }

      const container = containerRef.current
      const rect = container.getBoundingClientRect()
      const centerX = rect.width / 2
      const centerY = rect.height / 2

      // Calculate the point in canvas space that's currently at the center
      const canvasX = (centerX - pan.x) / zoom
      const canvasY = (centerY - pan.y) / zoom

      // After zoom, we want the same canvas point to be at the center
      const newPanX = centerX - canvasX * newZoom
      const newPanY = centerY - canvasY * newZoom

      setZoom(newZoom)
      setPan({ x: newPanX, y: newPanY })
    }
  }, [zoom, pan])

  // Drops a new component near the center of the visible canvas, with a small
  // cascade offset so repeated taps don't stack on the exact same point.
  const addComponentAtViewCenter = useCallback((componentType: ComponentType) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const screenCenterX = rect.width / 2
    const screenCenterY = rect.height / 2
    const canvasX = (screenCenterX - pan.x) / zoom
    const canvasY = (screenCenterY - pan.y) / zoom
    const cascade = (localComponents.length % 6) * 12 // px, in canvas space
    const xInMeters = pixelsToMeters(canvasX + cascade)
    const yInMeters = pixelsToMeters(canvasY + cascade)
    editor.addComponent({
      componentTypeId: componentType.id,
      xInMeters,
      yInMeters,
      widthInMeters: componentType.defaultWidthInMeters,
      heightInMeters: componentType.defaultHeightInMeters,
    })
  }, [pan, zoom, localComponents, pixelsToMeters, editor])

  // Calculate snap points for a component being dragged
  const calculateSnap = useCallback((
    draggedId: string,
    proposedX: number,
    proposedY: number,
    draggedWidth: number,
    draggedHeight: number
  ) => {
    const newSnapLines: SnapLine[] = []
    let snappedX = proposedX
    let snappedY = proposedY
    let hasXSnap = false
    let hasYSnap = false

    // Get edges of the dragged component (center, left, right, top, bottom)
    const draggedLeft = proposedX - draggedWidth / 2
    const draggedRight = proposedX + draggedWidth / 2
    const draggedTop = proposedY - draggedHeight / 2
    const draggedBottom = proposedY + draggedHeight / 2
    const draggedCenterX = proposedX
    const draggedCenterY = proposedY

    // Collect all existing gaps between components (for gap matching)
    const horizontalGaps: number[] = [] // gaps in X direction
    const verticalGaps: number[] = [] // gaps in Y direction

    const otherComponents = localComponents.filter(c => c.id !== draggedId)

    // Calculate gaps between all pairs of other components
    for (let i = 0; i < otherComponents.length; i++) {
      for (let j = i + 1; j < otherComponents.length; j++) {
        const a = otherComponents[i]
        const b = otherComponents[j]

        const aLeft = a.xInMeters - a.widthInMeters / 2
        const aRight = a.xInMeters + a.widthInMeters / 2
        const aTop = a.yInMeters - a.heightInMeters / 2
        const aBottom = a.yInMeters + a.heightInMeters / 2

        const bLeft = b.xInMeters - b.widthInMeters / 2
        const bRight = b.xInMeters + b.widthInMeters / 2
        const bTop = b.yInMeters - b.heightInMeters / 2
        const bBottom = b.yInMeters + b.heightInMeters / 2

        // Horizontal gap (X direction)
        if (aRight < bLeft) {
          horizontalGaps.push(bLeft - aRight)
        } else if (bRight < aLeft) {
          horizontalGaps.push(aLeft - bRight)
        }

        // Vertical gap (Y direction)
        if (aBottom < bTop) {
          verticalGaps.push(bTop - aBottom)
        } else if (bBottom < aTop) {
          verticalGaps.push(aTop - bBottom)
        }
      }
    }

    // Check against all other components
    for (const other of localComponents) {
      if (other.id === draggedId) continue

      const otherWidth = other.widthInMeters
      const otherHeight = other.heightInMeters
      const otherLeft = other.xInMeters - otherWidth / 2
      const otherRight = other.xInMeters + otherWidth / 2
      const otherTop = other.yInMeters - otherHeight / 2
      const otherBottom = other.yInMeters + otherHeight / 2
      const otherCenterX = other.xInMeters
      const otherCenterY = other.yInMeters

      // Vertical alignment checks (X axis)
      // Left to left
      if (Math.abs(draggedLeft - otherLeft) < SNAP_THRESHOLD_METERS) {
        snappedX = otherLeft + draggedWidth / 2
        newSnapLines.push({ type: 'vertical', position: metersToPixels(otherLeft) })
        hasXSnap = true
      }
      // Right to right
      else if (Math.abs(draggedRight - otherRight) < SNAP_THRESHOLD_METERS) {
        snappedX = otherRight - draggedWidth / 2
        newSnapLines.push({ type: 'vertical', position: metersToPixels(otherRight) })
        hasXSnap = true
      }
      // Center to center (X)
      else if (Math.abs(draggedCenterX - otherCenterX) < SNAP_THRESHOLD_METERS) {
        snappedX = otherCenterX
        newSnapLines.push({ type: 'vertical', position: metersToPixels(otherCenterX) })
        hasXSnap = true
      }
      // Left to right
      else if (Math.abs(draggedLeft - otherRight) < SNAP_THRESHOLD_METERS) {
        snappedX = otherRight + draggedWidth / 2
        newSnapLines.push({ type: 'vertical', position: metersToPixels(otherRight) })
        hasXSnap = true
      }
      // Right to left
      else if (Math.abs(draggedRight - otherLeft) < SNAP_THRESHOLD_METERS) {
        snappedX = otherLeft - draggedWidth / 2
        newSnapLines.push({ type: 'vertical', position: metersToPixels(otherLeft) })
        hasXSnap = true
      }

      // Horizontal alignment checks (Y axis)
      // Top to top
      if (Math.abs(draggedTop - otherTop) < SNAP_THRESHOLD_METERS) {
        snappedY = otherTop + draggedHeight / 2
        newSnapLines.push({ type: 'horizontal', position: metersToPixels(otherTop) })
        hasYSnap = true
      }
      // Bottom to bottom
      else if (Math.abs(draggedBottom - otherBottom) < SNAP_THRESHOLD_METERS) {
        snappedY = otherBottom - draggedHeight / 2
        newSnapLines.push({ type: 'horizontal', position: metersToPixels(otherBottom) })
        hasYSnap = true
      }
      // Center to center (Y)
      else if (Math.abs(draggedCenterY - otherCenterY) < SNAP_THRESHOLD_METERS) {
        snappedY = otherCenterY
        newSnapLines.push({ type: 'horizontal', position: metersToPixels(otherCenterY) })
        hasYSnap = true
      }
      // Top to bottom
      else if (Math.abs(draggedTop - otherBottom) < SNAP_THRESHOLD_METERS) {
        snappedY = otherBottom + draggedHeight / 2
        newSnapLines.push({ type: 'horizontal', position: metersToPixels(otherBottom) })
        hasYSnap = true
      }
      // Bottom to top
      else if (Math.abs(draggedBottom - otherTop) < SNAP_THRESHOLD_METERS) {
        snappedY = otherTop - draggedHeight / 2
        newSnapLines.push({ type: 'horizontal', position: metersToPixels(otherTop) })
        hasYSnap = true
      }
    }

    // Gap matching - snap to maintain equal spacing
    if (!hasXSnap) {
      for (const other of otherComponents) {
        const otherLeft = other.xInMeters - other.widthInMeters / 2
        const otherRight = other.xInMeters + other.widthInMeters / 2
        const otherCenterY = other.yInMeters

        // Check if dragged component is to the right of other
        const gapToRight = draggedLeft - otherRight
        if (gapToRight > 0) {
          for (const existingGap of horizontalGaps) {
            if (Math.abs(gapToRight - existingGap) < SNAP_THRESHOLD_METERS) {
              snappedX = otherRight + existingGap + draggedWidth / 2
              // Show gap indicator as a line between the two components
              const gapY = (draggedCenterY + otherCenterY) / 2
              newSnapLines.push({
                type: 'horizontal',
                position: metersToPixels(gapY),
                isGap: true,
                gapStart: metersToPixels(otherRight),
                gapEnd: metersToPixels(otherRight + existingGap),
                gapSizeMeters: existingGap,
              })
              hasXSnap = true
              break
            }
          }
        }

        // Check if dragged component is to the left of other
        const gapToLeft = otherLeft - draggedRight
        if (!hasXSnap && gapToLeft > 0) {
          for (const existingGap of horizontalGaps) {
            if (Math.abs(gapToLeft - existingGap) < SNAP_THRESHOLD_METERS) {
              snappedX = otherLeft - existingGap - draggedWidth / 2
              const gapY = (draggedCenterY + otherCenterY) / 2
              newSnapLines.push({
                type: 'horizontal',
                position: metersToPixels(gapY),
                isGap: true,
                gapStart: metersToPixels(otherLeft - existingGap),
                gapEnd: metersToPixels(otherLeft),
                gapSizeMeters: existingGap,
              })
              hasXSnap = true
              break
            }
          }
        }

        if (hasXSnap) break
      }
    }

    if (!hasYSnap) {
      for (const other of otherComponents) {
        const otherTop = other.yInMeters - other.heightInMeters / 2
        const otherBottom = other.yInMeters + other.heightInMeters / 2
        const otherCenterX = other.xInMeters

        // Check if dragged component is below other
        const gapBelow = draggedTop - otherBottom
        if (gapBelow > 0) {
          for (const existingGap of verticalGaps) {
            if (Math.abs(gapBelow - existingGap) < SNAP_THRESHOLD_METERS) {
              snappedY = otherBottom + existingGap + draggedHeight / 2
              const gapX = (draggedCenterX + otherCenterX) / 2
              newSnapLines.push({
                type: 'vertical',
                position: metersToPixels(gapX),
                isGap: true,
                gapStart: metersToPixels(otherBottom),
                gapEnd: metersToPixels(otherBottom + existingGap),
                gapSizeMeters: existingGap,
              })
              hasYSnap = true
              break
            }
          }
        }

        // Check if dragged component is above other
        const gapAbove = otherTop - draggedBottom
        if (!hasYSnap && gapAbove > 0) {
          for (const existingGap of verticalGaps) {
            if (Math.abs(gapAbove - existingGap) < SNAP_THRESHOLD_METERS) {
              snappedY = otherTop - existingGap - draggedHeight / 2
              const gapX = (draggedCenterX + otherCenterX) / 2
              newSnapLines.push({
                type: 'vertical',
                position: metersToPixels(gapX),
                isGap: true,
                gapStart: metersToPixels(otherTop - existingGap),
                gapEnd: metersToPixels(otherTop),
                gapSizeMeters: existingGap,
              })
              hasYSnap = true
              break
            }
          }
        }

        if (hasYSnap) break
      }
    }

    return { snappedX, snappedY, snapLines: newSnapLines }
  }, [localComponents, metersToPixels])

  // Latest snapped drag position, so onDragEnd persists the exact final spot
  // without depending on a possibly-stale localComponents closure.
  const lastDragPositionRef = useRef<{ id: string; xInMeters: number; yInMeters: number } | null>(null)

  // Move a component so its center sits at the given canvas-space pixel point,
  // applying snapping. Reuses the existing calculateSnap.
  const moveComponentToPixels = (id: string, newPxX: number, newPxY: number) => {
    const component = localComponents.find(c => c.id === id)
    if (!component) return
    const proposedX = pixelsToMeters(newPxX)
    const proposedY = pixelsToMeters(newPxY)
    const { snappedX, snappedY, snapLines } = calculateSnap(
      id, proposedX, proposedY, component.widthInMeters, component.heightInMeters
    )
    setLocalComponents(prev => prev.map(c => (c.id === id ? { ...c, xInMeters: snappedX, yInMeters: snappedY } : c)))
    setSnapLines(snapLines)
    setHasUnsavedChanges(true)
    lastDragPositionRef.current = { id, xInMeters: snappedX, yInMeters: snappedY }
  }

  // Captures each drag's start pixel position (mirrors the original startPosX/Y)
  // so we apply TOTAL movement, not accumulated deltas, avoiding snap drift.
  const dragStartRef = useRef<{ id: string; startPxX: number; startPxY: number } | null>(null)

  // Per-component drag: move that component; stopPropagation so the canvas doesn't pan.
  const bindComponent = useGesture(
    {
      onDragStart: ({ args, event }) => {
        const id = args[0] as string
        event.stopPropagation()
        setSelectedComponentId(id)
        const c = localComponents.find(x => x.id === id)
        if (c) dragStartRef.current = { id, startPxX: metersToPixels(c.xInMeters), startPxY: metersToPixels(c.yInMeters) }
      },
      onDrag: ({ args, movement: [mx, my], tap, event }) => {
        const id = args[0] as string
        event.stopPropagation()
        if (tap) { setSelectedComponentId(id); return } // tap = select only
        const start = dragStartRef.current
        if (!start || start.id !== id) return
        moveComponentToPixels(id, start.startPxX + mx / zoom, start.startPxY + my / zoom)
      },
      onDragEnd: ({ args }) => {
        const id = args[0] as string
        setSnapLines([])
        dragStartRef.current = null
        const pos = lastDragPositionRef.current
        if (pos && pos.id === id) {
          editor.bulkUpdate([{ id, xInMeters: pos.xInMeters, yInMeters: pos.yInMeters }])
          lastDragPositionRef.current = null
        }
      },
    },
    { drag: { filterTaps: true, pointer: { touch: true } } }
  )

  // Canvas-level: 1-pointer drag on empty space pans; pinch zooms around its midpoint.
  const bindCanvas = useGesture(
    {
      onDrag: ({ delta: [dx, dy], pinching, tap, event }) => {
        if (pinching) return
        // If the gesture started on a component, let the component's own drag handle
        // it — don't pan or deselect the canvas. On touch the two gesture instances
        // both receive the move (stopPropagation isn't honored across them), so we
        // disambiguate by target: touch events keep their original touchstart target.
        const tgt = event?.target as HTMLElement | null
        const onComponent = !!(tgt && tgt.closest && tgt.closest('[data-placed-component]'))
        if (tap) {
          if (!onComponent) setSelectedComponentId(null)
          return
        }
        if (onComponent) return
        setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }))
      },
      onPinch: ({ origin: [ox, oy], offset: [scale] }) => {
        const rect = containerRef.current?.getBoundingClientRect()
        if (!rect) return
        const newZoom = Math.max(0.1, Math.min(8, scale))
        const cx = ox - rect.left
        const cy = oy - rect.top
        const canvasX = (cx - pan.x) / zoom
        const canvasY = (cy - pan.y) / zoom
        setPan({ x: cx - canvasX * newZoom, y: cy - canvasY * newZoom })
        setZoom(newZoom)
      },
    },
    { drag: { filterTaps: true, pointer: { touch: true } }, pinch: { from: () => [zoom, 0] as [number, number] } }
  )

  // Handle save
  const handleSave = () => {
    const updates = localComponents.map(c => ({
      id: c.id,
      xInMeters: c.xInMeters,
      yInMeters: c.yInMeters,
      widthInMeters: c.widthInMeters,
      heightInMeters: c.heightInMeters,
      rotation: c.rotation,
    }))

    editor.bulkUpdate(updates)
  }

  // Open edit dialog
  const handleEditComponent = (component: PlacedComponent) => {
    setEditingComponent(component)
    setEditForm({
      label: component.label || '',
      rotation: component.rotation.toString(),
    })
    setEditDialogOpen(true)
  }

  // Save component edit
  const handleSaveEdit = () => {
    if (!editingComponent) return

    editor.updateComponent({
      id: editingComponent.id,
      label: editForm.label || null,
      rotation: parseFloat(editForm.rotation) || 0,
    })

    setLocalComponents(prev =>
      prev.map(c =>
        c.id === editingComponent.id
          ? { ...c, label: editForm.label || null, rotation: parseFloat(editForm.rotation) || 0 }
          : c
      )
    )
  }

  const rotateComponent = (id: string, deltaDeg: number) => {
    const target = localComponents.find(c => c.id === id)
    if (!target) return
    const rotation = ((Math.round(target.rotation) + deltaDeg) % 360 + 360) % 360
    setLocalComponents(prev => prev.map(c => (c.id === id ? { ...c, rotation } : c)))
    editor.updateComponentSilent({ id, rotation })
  }

  // Total seats across all placed components (sum of each component type's occupancy).
  const totalSeats = useMemo(
    () => localComponents.reduce((sum, c) => sum + (c.componentType?.occupancy ?? 0), 0),
    [localComponents]
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">{source.kind === 'template' ? t('templateEditor.notFound') : t('eventFloorPlan.notFound')}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden">
      {/* Header */}
      <div className="border-b bg-background">
        {/* Row 1: back + title */}
        <div className="flex items-center gap-4 px-4 py-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(getBackHref(data))}
          >
            <ArrowLeft className="h-5 w-5 rtl:rotate-180" />
          </Button>
          <div>
            <h1 className="font-semibold">{data.name}</h1>
            <p className="text-sm text-muted-foreground">{data.floorPlan?.name}</p>
          </div>
        </div>
        {/* Row 2: total seats at the start, controls at the end */}
        <div className="flex items-center justify-between gap-2 px-4 py-2 border-t">
          <div className="flex items-center gap-1.5 text-sm">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">{t('templateEditor.totalSeats')}</span>
            <span className="font-semibold tabular-nums">{totalSeats}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-1 border rounded-md">
              <Button variant="ghost" size="icon" onClick={handleZoomOut}>
                <Minus className="h-4 w-4" />
              </Button>
              <span className="text-sm w-16 text-center">{Math.round(zoom * 100)}%</span>
              <Button variant="ghost" size="icon" onClick={handleZoomIn}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <Button variant="ghost" size="icon" onClick={handleResetZoom}>
              <RotateCcw className="h-4 w-4" />
            </Button>
            {isMobile && (
              <Button variant="outline" size="sm" onClick={() => setPaletteOpen(true)}>
                <Plus className="h-4 w-4 me-1" />
                {t('templateEditor.components')}
              </Button>
            )}
            <Button
              onClick={handleSave}
              disabled={!hasUnsavedChanges || editor.bulkUpdatePending}
            >
              {editor.bulkUpdatePending ? (
                <Loader2 className="h-4 w-4 me-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 me-2" />
              )}
              {t('common.save')}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Component Types (desktop) */}
        <div className="w-64 border-e bg-muted/30 hidden md:block">
          <ComponentPalette
            componentTypes={componentTypes}
            onAdd={addComponentAtViewCenter}
            onEdit={(ct) => { setEditingComponentType(ct); setComponentTypeDialogOpen(true) }}
            onNewType={() => { setEditingComponentType(null); setComponentTypeDialogOpen(true) }}
          />
        </div>

        {/* Canvas */}
        <div
          ref={containerRef}
          className="flex-1 overflow-hidden bg-muted/50 cursor-grab"
          style={{ touchAction: 'none' }}
          onWheel={handleWheel}
          {...bindCanvas()}
        >
          <div
            ref={canvasRef}
            className="relative origin-top-left"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            }}
          >
            {/* Floor plan image - let browser render at its DPI-adjusted size */}
            {imageUrl && (
              <img
                ref={imageRef}
                src={imageUrl}
                alt={data.floorPlan?.name}
                className="pointer-events-none select-none block"
                draggable={false}
                onLoad={(e) => {
                  const img = e.currentTarget
                  setImageSize({ width: img.naturalWidth, height: img.naturalHeight })
                  setRenderedImageSize({ width: img.offsetWidth, height: img.offsetHeight })
                }}
              />
            )}

            {/* Placed components */}
            {localComponents.map(component => {
              const x = metersToPixels(component.xInMeters)
              const y = metersToPixels(component.yInMeters)
              const width = metersToPixels(component.widthInMeters)
              const height = metersToPixels(component.heightInMeters)
              const isSelected = selectedComponentId === component.id
              const seats = component.componentType?.occupancy ?? 0
              const labelText = component.label || component.componentType?.name || ''
              // Too thin to fit a readable label inside → show the label above it.
              const labelOutside = Math.min(component.widthInMeters, component.heightInMeters) < 0.5

              return (
                <div
                  key={component.id}
                  className="absolute"
                  style={{
                    left: x,
                    top: y,
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  {labelOutside && (labelText || seats > 0) && (
                    <div className="absolute bottom-full left-1/2 mb-0.5 -translate-x-1/2 flex flex-col items-center pointer-events-none">
                      <FitText text={labelText} boxWidth={width} boxHeight={13} />
                      {seats > 0 && (
                        <FitText text={`${seats}`} boxWidth={width} boxHeight={11} />
                      )}
                    </div>
                  )}
                  {/* Component body with rotation wrapper */}
                  <div
                    className="relative"
                    style={{
                      transform: `rotate(${component.rotation}deg)`,
                    }}
                  >
                    <div
                      className="flex flex-col items-center justify-center text-xs font-medium cursor-move select-none overflow-hidden"
                      style={{
                        width,
                        height,
                        backgroundColor: component.componentType?.color || '#E5E7EB',
                        borderRadius: component.componentType?.borderRadius
                          ? `${component.componentType.borderRadius}px`
                          : '4px',
                        opacity: 0.85,
                        border: isSelected
                          ? '1px solid #3b82f6'
                          : '1px solid transparent',
                      }}
                      {...bindComponent(component.id)}
                      data-placed-component=""
                      onPointerDownCapture={() => setSelectedComponentId(component.id)}
                      onDoubleClick={() => handleEditComponent(component)}
                    >
                      {!labelOutside && (
                        <>
                          <FitText
                            text={labelText}
                            boxWidth={width}
                            boxHeight={seats > 0 ? height * 0.5 : height}
                          />
                          {seats > 0 && (
                            <div className="mt-0.5 flex w-full justify-center">
                              <FitText text={`${seats}`} boxWidth={width * 0.95} boxHeight={height * 0.45} />
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}

            {/* Snap guide lines */}
            {snapLines.map((line, index) => {
              // Gap indicator - show as a line segment with size label
              if (line.isGap && line.gapStart !== undefined && line.gapEnd !== undefined) {
                const isHorizontalGap = line.type === 'horizontal' // horizontal line = gap in X direction
                return (
                  <div key={index} className="absolute pointer-events-none">
                    {/* Gap line */}
                    <div
                      style={
                        isHorizontalGap
                          ? {
                              position: 'absolute',
                              left: line.gapStart,
                              top: line.position - 1,
                              width: line.gapEnd - line.gapStart,
                              height: 2,
                              backgroundColor: '#22c55e',
                            }
                          : {
                              position: 'absolute',
                              left: line.position - 1,
                              top: line.gapStart,
                              width: 2,
                              height: line.gapEnd - line.gapStart,
                              backgroundColor: '#22c55e',
                            }
                      }
                    />
                    {/* Gap size label */}
                    <div
                      className="absolute bg-green-500 text-white text-xs px-1 rounded"
                      style={
                        isHorizontalGap
                          ? {
                              left: line.gapStart + (line.gapEnd - line.gapStart) / 2,
                              top: line.position - 10,
                              transform: 'translateX(-50%)',
                              fontSize: '10px',
                              whiteSpace: 'nowrap',
                            }
                          : {
                              left: line.position + 4,
                              top: line.gapStart + (line.gapEnd - line.gapStart) / 2,
                              transform: 'translateY(-50%)',
                              fontSize: '10px',
                              whiteSpace: 'nowrap',
                            }
                      }
                    >
                      {line.gapSizeMeters?.toFixed(2)}m
                    </div>
                  </div>
                )
              }

              // Regular alignment line
              return (
                <div
                  key={index}
                  className="absolute pointer-events-none"
                  style={
                    line.type === 'vertical'
                      ? {
                          left: line.position,
                          top: 0,
                          width: 1,
                          height: renderedImageSize?.height || 2000,
                          backgroundColor: '#f97316',
                        }
                      : {
                          left: 0,
                          top: line.position,
                          width: renderedImageSize?.width || 2000,
                          height: 1,
                          backgroundColor: '#f97316',
                        }
                  }
                />
              )
            })}
          </div>
        </div>

        {/* Properties panel (desktop) */}
        <div className="w-64 border-s bg-background p-4 hidden md:block">
          <h3 className="font-medium mb-4">{t('templateEditor.properties')}</h3>
          <ComponentPropertiesPanel
            component={localComponents.find(c => c.id === selectedComponentId) ?? null}
            onRotate={(d) => selectedComponentId && rotateComponent(selectedComponentId, d)}
            onDelete={() => selectedComponentId && editor.deleteComponent({ id: selectedComponentId })}
            onEdit={() => {
              const c = localComponents.find(c => c.id === selectedComponentId)
              if (c) handleEditComponent(c)
            }}
          />
        </div>
      </div>

      {/* Mobile palette drawer */}
      {isMobile && (
        <Drawer open={paletteOpen} onOpenChange={setPaletteOpen}>
          <DrawerContent>
            <DrawerTitle className="sr-only">{t('templateEditor.components')}</DrawerTitle>
            <ComponentPalette
              componentTypes={componentTypes}
              onAdd={(componentType) => { addComponentAtViewCenter(componentType); setPaletteOpen(false) }}
              onEdit={(ct) => { setPaletteOpen(false); setEditingComponentType(ct); setComponentTypeDialogOpen(true) }}
              onNewType={() => { setPaletteOpen(false); setEditingComponentType(null); setComponentTypeDialogOpen(true) }}
            />
          </DrawerContent>
        </Drawer>
      )}

      {/* Mobile properties bottom bar */}
      {isMobile && selectedComponentId && (
        <div className="fixed bottom-0 inset-x-0 z-20 border-t bg-background">
          <ComponentPropertiesPanel
            component={localComponents.find(c => c.id === selectedComponentId) ?? null}
            compact
            onRotate={(d) => rotateComponent(selectedComponentId, d)}
            onDelete={() => editor.deleteComponent({ id: selectedComponentId })}
            onEdit={() => {
              const c = localComponents.find(c => c.id === selectedComponentId)
              if (c) handleEditComponent(c)
            }}
          />
        </div>
      )}

      {/* Edit Component Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('templateEditor.editComponent')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="label">{t('templateEditor.label')}</Label>
              <Input
                id="label"
                value={editForm.label}
                onChange={(e) => setEditForm(prev => ({ ...prev, label: e.target.value }))}
                placeholder={editingComponent?.componentType?.name}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rotation">{t('templateEditor.rotation')}</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="rotation"
                  type="number"
                  min="0"
                  max="360"
                  value={editForm.rotation}
                  onChange={(e) => setEditForm(prev => ({ ...prev, rotation: e.target.value }))}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">°</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSaveEdit} disabled={editor.updateComponentPending}>
              {editor.updateComponentPending && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New component type dialog (shared with the component types page) */}
      <ComponentTypeFormDialog
        open={componentTypeDialogOpen}
        onOpenChange={setComponentTypeDialogOpen}
        organizationId={currentOrg?.id || ''}
        editingComponentType={editingComponentType}
      />

      {/* Pan hint (desktop only — references Alt/drag and would be covered by the mobile bottom bar) */}
      <div className="hidden md:block absolute bottom-4 left-1/2 -translate-x-1/2 bg-background/80 backdrop-blur-sm px-3 py-1.5 rounded-full text-sm text-muted-foreground border">
        {t('floorPlans.panHint')}
      </div>

    </div>
  )
}
