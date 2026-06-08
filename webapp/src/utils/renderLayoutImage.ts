import type { inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from '@/../../server/src/routers/appRouter'

type RouterOutput = inferRouterOutputs<AppRouter>
type EventLayout = RouterOutput['floorPlans']['eventLayouts']['list'][number]

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2))
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
}

/** Largest font (px) at which `text` fits within maxWidth, capped by maxHeight. */
function fitFontSize(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxHeight: number,
): number {
  if (!text) return maxHeight
  let size = Math.max(1, maxHeight)
  ctx.font = `600 ${size}px sans-serif`
  const w = ctx.measureText(text).width
  if (w > maxWidth && w > 0) size = Math.max(1, size * (maxWidth / w))
  return size
}

/**
 * Renders an event floor-plan layout (the calibrated image + its placed
 * components, with labels and seat counts) to a PNG Blob at the floor plan's
 * native resolution. Mirrors the editor's mapping: a component at xInMeters
 * sits at xInMeters * pixelsPerMeter on the natural image.
 *
 * Note: drawing the floor-plan image onto a canvas requires the image host
 * (Wasabi) to allow cross-origin reads (CORS on GET); otherwise the canvas is
 * tainted and export throws.
 */
export async function renderEventLayoutToBlob(layout: EventLayout, imageUrl: string): Promise<Blob> {
  // Fetch the image as a blob and draw it via an object URL. This keeps the
  // canvas same-origin (not tainted) and — unlike an <img crossorigin> pointed
  // at the same URL — avoids reusing the browser's previously-cached non-CORS
  // copy (loaded earlier by the editor/preview), which would fail to load.
  const response = await fetch(imageUrl, { mode: 'cors', cache: 'no-store' })
  if (!response.ok) throw new Error(`Failed to load floor plan image (${response.status})`)
  const objectUrl = URL.createObjectURL(await response.blob())
  const img = new Image()
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = () => reject(new Error('Failed to decode floor plan image'))
    img.src = objectUrl
  })

  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    URL.revokeObjectURL(objectUrl)
    throw new Error('Canvas is not supported')
  }
  ctx.drawImage(img, 0, 0)
  URL.revokeObjectURL(objectUrl)

  const ppm = layout.floorPlan?.pixelsPerMeter ?? 100

  for (const c of layout.components) {
    const cx = c.xInMeters * ppm
    const cy = c.yInMeters * ppm
    const w = c.widthInMeters * ppm
    const h = c.heightInMeters * ppm

    // Colored box (rotated about its center, matching the editor's 0.85 opacity).
    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate((c.rotation * Math.PI) / 180)
    ctx.globalAlpha = 0.85
    ctx.fillStyle = c.componentType?.color || '#E5E7EB'
    roundRectPath(ctx, -w / 2, -h / 2, w, h, c.componentType?.borderRadius ?? 4)
    ctx.fill()
    ctx.restore()

    // Label + seat count (unrotated, like the editor).
    const label = c.label || c.componentType?.name || ''
    const seats = c.componentType?.occupancy ?? 0
    const thin = Math.min(c.widthInMeters, c.heightInMeters) < 0.5

    ctx.save()
    ctx.globalAlpha = 1
    ctx.fillStyle = '#111827'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    if (thin) {
      // Above the box for components too thin to fit text inside (limited to the
      // component's width so it doesn't spill past its footprint).
      const fs = Math.max(2, fitFontSize(ctx, label || `${seats}`, w, 16))
      ctx.font = `600 ${fs}px sans-serif`
      const topY = cy - h / 2 - fs * 0.7
      if (label) ctx.fillText(label, cx, topY)
      if (seats > 0) ctx.fillText(`${seats}`, cx, topY - fs)
    } else {
      const labelFs = fitFontSize(ctx, label, w * 0.9, seats > 0 ? h * 0.42 : h * 0.6)
      ctx.font = `600 ${labelFs}px sans-serif`
      if (label) ctx.fillText(label, cx, seats > 0 ? cy - h * 0.16 : cy)
      if (seats > 0) {
        const seatFs = fitFontSize(ctx, `${seats}`, w * 0.9, h * 0.4)
        ctx.font = `700 ${seatFs}px sans-serif`
        ctx.fillText(`${seats}`, cx, cy + h * 0.22)
      }
    }
    ctx.restore()
  }

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Failed to export image'))),
      'image/png',
    )
  })
}
