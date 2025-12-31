import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { trpc } from '@/utils/trpc'
import { useCurrentOrg } from '@/contexts/CurrentOrgContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
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
  RotateCw,
  Save,
  Loader2,
  Trash2,
  GripVertical,
} from 'lucide-react'
import { toast } from 'sonner'
import { useSignedUrl } from '@/hooks/useSignedUrl'
import type { inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from '@/../../server/src/routers/appRouter'

type RouterOutput = inferRouterOutputs<AppRouter>
type Template = RouterOutput['floorPlans']['templates']['get']
type TemplateComponent = Template['components'][0]
type ComponentType = RouterOutput['floorPlans']['componentTypes']['list'][0]

type PlacedComponent = TemplateComponent & {
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

export function TemplateEditor() {
  const { templateId } = useParams<{ templateId: string }>()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { currentOrg } = useCurrentOrg()
  const canvasRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Canvas state
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [isAltPressed, setIsAltPressed] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })

  // Component state
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null)
  const [draggedComponentType, setDraggedComponentType] = useState<ComponentType | null>(null)
  const [localComponents, setLocalComponents] = useState<PlacedComponent[]>([])
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // Dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingComponent, setEditingComponent] = useState<PlacedComponent | null>(null)
  const [editForm, setEditForm] = useState({ label: '', rotation: '0' })

  // Snap lines state
  const [snapLines, setSnapLines] = useState<SnapLine[]>([])

  // Image dimensions
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null)
  const [renderedImageSize, setRenderedImageSize] = useState<{ width: number; height: number } | null>(null)

  const utils = trpc.useUtils()

  // Fetch template data
  const { data: template, isLoading: isLoadingTemplate } = trpc.floorPlans.templates.get.useQuery(
    { id: templateId! },
    { enabled: !!templateId }
  )

  // Fetch component types for the sidebar
  const { data: componentTypes } = trpc.floorPlans.componentTypes.list.useQuery(
    { organizationId: currentOrg?.id || '' },
    { enabled: !!currentOrg?.id }
  )

  // Get signed URL for floor plan image
  const { signedUrl: imageUrl } = useSignedUrl({
    fileId: template?.floorPlan?.imageFile?.id,
  })

  // Mutations
  const addComponentMutation = trpc.floorPlans.templates.addComponent.useMutation({
    onSuccess: (newComponent) => {
      setLocalComponents(prev => [...prev, newComponent])
      toast.success(t('templateEditor.componentAdded'))
    },
    onError: (error) => {
      toast.error(t('templateEditor.componentAddError'), { description: error.message })
    },
  })

  const updateComponentMutation = trpc.floorPlans.templates.updateComponent.useMutation({
    onSuccess: () => {
      toast.success(t('templateEditor.componentUpdated'))
      setEditDialogOpen(false)
      setEditingComponent(null)
    },
    onError: (error) => {
      toast.error(t('templateEditor.componentUpdateError'), { description: error.message })
    },
  })

  const deleteComponentMutation = trpc.floorPlans.templates.deleteComponent.useMutation({
    onSuccess: () => {
      setLocalComponents(prev => prev.filter(c => c.id !== selectedComponentId))
      setSelectedComponentId(null)
      toast.success(t('templateEditor.componentDeleted'))
    },
    onError: (error) => {
      toast.error(t('templateEditor.componentDeleteError'), { description: error.message })
    },
  })

  const bulkUpdateMutation = trpc.floorPlans.templates.bulkUpdateComponents.useMutation({
    onSuccess: () => {
      setHasUnsavedChanges(false)
    },
    onError: (error) => {
      toast.error(t('templateEditor.saveError'), { description: error.message })
    },
  })

  // Initialize local components from template
  useEffect(() => {
    if (template?.components) {
      setLocalComponents(template.components)
    }
  }, [template?.components])

  // Track Alt key for panning
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Alt') setIsAltPressed(true)
      if (e.key === 'Delete' && selectedComponentId) {
        deleteComponentMutation.mutate({ id: selectedComponentId })
      }
    }
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Alt') setIsAltPressed(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [selectedComponentId])

  // Calculate DPI scale factor (how much the browser scales down the image due to DPI metadata)
  const dpiScale = useMemo(() => {
    if (!imageSize || !renderedImageSize) return 1
    // If natural size > rendered size, browser is scaling down due to DPI
    return renderedImageSize.width / imageSize.width
  }, [imageSize, renderedImageSize])

  // Convert pixel coordinates to meters (accounting for DPI scaling)
  // Input pixels are in "displayed" space, need to convert to "natural" space first
  const pixelsToMeters = useCallback((pixels: number) => {
    if (!template?.floorPlan?.pixelsPerMeter) return pixels / 100
    // Divide by dpiScale to convert from displayed pixels to natural pixels
    return (pixels / dpiScale) / template.floorPlan.pixelsPerMeter
  }, [template?.floorPlan?.pixelsPerMeter, dpiScale])

  // Convert meters to pixels (accounting for DPI scaling)
  // Output is in "displayed" space
  const metersToPixels = useCallback((meters: number) => {
    if (!template?.floorPlan?.pixelsPerMeter) return meters * 100
    // Scale down by DPI factor so components match the displayed image size
    return meters * template.floorPlan.pixelsPerMeter * dpiScale
  }, [template?.floorPlan?.pixelsPerMeter, dpiScale])

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

  // Handle canvas mouse down for panning
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.altKey || e.button === 1) {
      setIsPanning(true)
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
      e.preventDefault()
    } else if (e.target === canvasRef.current) {
      setSelectedComponentId(null)
    }
  }

  // Handle mouse move for panning
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      })
    }
  }, [isPanning, panStart])

  // Handle mouse up
  const handleMouseUp = () => {
    setIsPanning(false)
  }

  // Handle drop from sidebar
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (!draggedComponentType || !canvasRef.current || !templateId) return

    const rect = canvasRef.current.getBoundingClientRect()
    // Convert screen coordinates to image coordinates
    // rect already includes the transform, so we just need to account for zoom
    const x = (e.clientX - rect.left) / zoom
    const y = (e.clientY - rect.top) / zoom

    const xInMeters = pixelsToMeters(x)
    const yInMeters = pixelsToMeters(y)

    addComponentMutation.mutate({
      templateId,
      componentTypeId: draggedComponentType.id,
      xInMeters,
      yInMeters,
      widthInMeters: draggedComponentType.defaultWidthInMeters,
      heightInMeters: draggedComponentType.defaultHeightInMeters,
      rotation: 0,
    })

    setDraggedComponentType(null)
  }

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

  // Handle component drag
  const handleComponentDrag = (componentId: string, e: React.MouseEvent) => {
    if (e.altKey) return // Don't start drag if panning

    e.stopPropagation()
    setSelectedComponentId(componentId)

    const startX = e.clientX
    const startY = e.clientY
    const component = localComponents.find(c => c.id === componentId)
    if (!component) return

    const startPosX = metersToPixels(component.xInMeters)
    const startPosY = metersToPixels(component.yInMeters)
    let finalX = component.xInMeters
    let finalY = component.yInMeters

    const handleDragMove = (moveEvent: MouseEvent) => {
      const deltaX = (moveEvent.clientX - startX) / zoom
      const deltaY = (moveEvent.clientY - startY) / zoom

      const proposedX = pixelsToMeters(startPosX + deltaX)
      const proposedY = pixelsToMeters(startPosY + deltaY)

      // Calculate snap
      const { snappedX, snappedY, snapLines: newSnapLines } = calculateSnap(
        componentId,
        proposedX,
        proposedY,
        component.widthInMeters,
        component.heightInMeters
      )

      finalX = snappedX
      finalY = snappedY
      setSnapLines(newSnapLines)

      setLocalComponents(prev =>
        prev.map(c =>
          c.id === componentId
            ? { ...c, xInMeters: finalX, yInMeters: finalY }
            : c
        )
      )
    }

    const handleDragEnd = () => {
      document.removeEventListener('mousemove', handleDragMove)
      document.removeEventListener('mouseup', handleDragEnd)
      setSnapLines([]) // Clear snap lines

      // Auto-save position after drag ends
      if (finalX !== component.xInMeters || finalY !== component.yInMeters) {
        bulkUpdateMutation.mutate({
          templateId: templateId!,
          components: [{
            id: componentId,
            xInMeters: finalX,
            yInMeters: finalY,
          }],
        })
      }
    }

    document.addEventListener('mousemove', handleDragMove)
    document.addEventListener('mouseup', handleDragEnd)
  }

  // Handle component rotation
  const handleComponentRotation = (componentId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()

    const component = localComponents.find(c => c.id === componentId)
    if (!component) return

    const centerX = metersToPixels(component.xInMeters)
    const centerY = metersToPixels(component.yInMeters)

    // Get the canvas position to calculate correct coordinates
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()

    let finalRotation = component.rotation

    const handleRotateMove = (moveEvent: MouseEvent) => {
      // Calculate mouse position relative to canvas (accounting for pan and zoom)
      const mouseX = (moveEvent.clientX - rect.left) / zoom
      const mouseY = (moveEvent.clientY - rect.top) / zoom

      // Calculate angle from component center to mouse position
      const deltaX = mouseX - centerX
      const deltaY = mouseY - centerY
      let angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI)

      // Adjust angle (atan2 gives angle from positive X axis, we want from top-right)
      angle = angle + 45 // Offset since handle is at top-right corner

      // Normalize to 0-360
      angle = ((angle % 360) + 360) % 360

      // Always snap to 15-degree increments
      angle = Math.round(angle / 15) * 15

      finalRotation = angle

      setLocalComponents(prev =>
        prev.map(c =>
          c.id === componentId
            ? { ...c, rotation: finalRotation }
            : c
        )
      )
    }

    const handleRotateEnd = () => {
      document.removeEventListener('mousemove', handleRotateMove)
      document.removeEventListener('mouseup', handleRotateEnd)

      // Auto-save rotation after drag ends
      if (finalRotation !== component.rotation) {
        bulkUpdateMutation.mutate({
          templateId: templateId!,
          components: [{
            id: componentId,
            rotation: finalRotation,
          }],
        })
      }
    }

    document.addEventListener('mousemove', handleRotateMove)
    document.addEventListener('mouseup', handleRotateEnd)
  }

  // Handle save
  const handleSave = () => {
    if (!templateId) return

    const updates = localComponents.map(c => ({
      id: c.id,
      xInMeters: c.xInMeters,
      yInMeters: c.yInMeters,
      widthInMeters: c.widthInMeters,
      heightInMeters: c.heightInMeters,
      rotation: c.rotation,
    }))

    bulkUpdateMutation.mutate({
      templateId,
      components: updates,
    })
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

    updateComponentMutation.mutate({
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

  // Group component types by category
  const groupedComponentTypes = componentTypes?.reduce((acc, ct) => {
    if (!acc[ct.category]) {
      acc[ct.category] = []
    }
    acc[ct.category].push(ct)
    return acc
  }, {} as Record<string, ComponentType[]>)

  if (isLoadingTemplate) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!template) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">{t('templateEditor.notFound')}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-background">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/floor-plans/${template.floorPlanId}`)}
          >
            <ArrowLeft className="h-5 w-5 rtl:rotate-180" />
          </Button>
          <div>
            <h1 className="font-semibold">{template.name}</h1>
            <p className="text-sm text-muted-foreground">{template.floorPlan?.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 border rounded-md">
            <Button variant="ghost" size="icon" onClick={handleZoomOut}>
              <Minus className="h-4 w-4" />
            </Button>
            <span className="text-sm w-16 text-center">{Math.round(zoom * 100)}%</span>
            <Button variant="ghost" size="icon" onClick={handleZoomIn}>
              <Plus className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleResetZoom}>
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
          <Button
            onClick={handleSave}
            disabled={!hasUnsavedChanges || bulkUpdateMutation.isPending}
          >
            {bulkUpdateMutation.isPending ? (
              <Loader2 className="h-4 w-4 me-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 me-2" />
            )}
            {t('common.save')}
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Component Types */}
        <div className="w-64 border-e bg-muted/30">
          <div className="p-3 border-b">
            <h2 className="font-medium">{t('templateEditor.components')}</h2>
          </div>
          <ScrollArea className="h-[calc(100vh-120px)]">
            <div className="p-2 space-y-4">
              {groupedComponentTypes && Object.entries(groupedComponentTypes).map(([category, types]) => (
                <div key={category}>
                  <h3 className="text-xs font-medium text-muted-foreground mb-2 px-2">{category}</h3>
                  <div className="space-y-1">
                    {types.map(ct => (
                      <div
                        key={ct.id}
                        draggable
                        onDragStart={() => setDraggedComponentType(ct)}
                        onDragEnd={() => setDraggedComponentType(null)}
                        className="flex items-center gap-2 p-2 rounded-md hover:bg-muted cursor-grab active:cursor-grabbing"
                      >
                        <div
                          className="w-6 h-6 flex-shrink-0 border"
                          style={{
                            backgroundColor: ct.color || '#E5E7EB',
                            borderRadius: ct.borderRadius ? `${Math.min(ct.borderRadius, 12)}px` : '2px',
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm truncate">{ct.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {ct.defaultWidthInMeters}m × {ct.defaultHeightInMeters}m
                          </div>
                        </div>
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Canvas */}
        <div
          ref={containerRef}
          className={`flex-1 overflow-hidden bg-muted/50 ${
            isPanning ? 'cursor-grabbing' : isAltPressed ? 'cursor-grab' : 'cursor-default'
          }`}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
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
                src={imageUrl}
                alt={template.floorPlan?.name}
                className="pointer-events-none select-none block"
                draggable={false}
                onLoad={(e) => {
                  const img = e.currentTarget
                  setImageSize({ width: img.naturalWidth, height: img.naturalHeight })
                  setRenderedImageSize({ width: img.width, height: img.height })
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
                  {/* Component body with rotation wrapper */}
                  <div
                    className="relative"
                    style={{
                      transform: `rotate(${component.rotation}deg)`,
                    }}
                  >
                    <div
                      className="flex items-center justify-center text-xs font-medium cursor-move select-none overflow-hidden"
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
                      onMouseDown={(e) => handleComponentDrag(component.id, e)}
                      onDoubleClick={() => handleEditComponent(component)}
                    >
                      <span
                        className="text-center leading-none break-words"
                        style={{
                          maxWidth: '95%',
                          maxHeight: '90%',
                          overflow: 'hidden',
                          fontSize: `${Math.max(4, Math.min(10, Math.min(width, height) * 0.2))}px`,
                          wordBreak: 'break-word',
                          display: '-webkit-box',
                          WebkitLineClamp: Math.max(1, Math.floor(height / 8)),
                          WebkitBoxOrient: 'vertical',
                        }}
                      >
                        {component.label || component.componentType?.name}
                      </span>
                    </div>

                    {/* Rotation handle - attached to top-right corner */}
                    {isSelected && (
                      <div
                        className="absolute cursor-grab active:cursor-grabbing"
                        style={{
                          right: -8,
                          top: -8,
                          transform: 'translate(50%, -50%)',
                        }}
                        onMouseDown={(e) => handleComponentRotation(component.id, e)}
                      >
                        <div
                          className="w-5 h-5 bg-blue-500 rounded-full border-2 border-white shadow-md flex items-center justify-center"
                          title="Drag to rotate (hold Shift for 15° increments)"
                        >
                          <RotateCw className="w-3 h-3 text-white" />
                        </div>
                      </div>
                    )}
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

        {/* Properties panel - always visible to prevent layout shift */}
        <div className="w-64 border-s bg-background p-4">
          <h3 className="font-medium mb-4">{t('templateEditor.properties')}</h3>
          {selectedComponentId ? (
            (() => {
              const component = localComponents.find(c => c.id === selectedComponentId)
              if (!component) return <p className="text-sm text-muted-foreground">Select a component</p>
              return (
                <div className="space-y-4">
                  <div>
                    <Label className="text-muted-foreground">{t('templateEditor.type')}</Label>
                    <p className="font-medium">{component.componentType?.name}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">{t('templateEditor.position')}</Label>
                    <p className="text-sm">
                      X: {component.xInMeters.toFixed(2)}m, Y: {component.yInMeters.toFixed(2)}m
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">{t('templateEditor.size')}</Label>
                    <p className="text-sm">
                      {component.widthInMeters.toFixed(2)}m × {component.heightInMeters.toFixed(2)}m
                    </p>
                  </div>
                  {component.label && (
                    <div>
                      <Label className="text-muted-foreground">{t('templateEditor.label')}</Label>
                      <p className="font-medium">{component.label}</p>
                    </div>
                  )}
                  <div className="flex gap-2 pt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleEditComponent(component)}
                    >
                      {t('common.edit')}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteComponentMutation.mutate({ id: component.id })}
                      disabled={deleteComponentMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )
            })()
          ) : (
            <p className="text-sm text-muted-foreground">Select a component to view its properties</p>
          )}
        </div>
      </div>

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
            <Button onClick={handleSaveEdit} disabled={updateComponentMutation.isPending}>
              {updateComponentMutation.isPending && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pan hint */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-background/80 backdrop-blur-sm px-3 py-1.5 rounded-full text-sm text-muted-foreground border">
        {t('floorPlans.panHint')}
      </div>

    </div>
  )
}
