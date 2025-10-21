import * as React from "react"
import { Drawer as DrawerPrimitive } from "vaul"
import { useDrawerBackButton } from "@/hooks/useDrawerBackButton"

import { cn } from "@/lib/utils"

type DrawerProps = {
  shouldScaleBackground?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
  backButtonId?: string
  children?: React.ReactNode
  [key: string]: any
}

const Drawer = ({
  shouldScaleBackground = true,
  open,
  onOpenChange,
  backButtonId,
  ...props
}: DrawerProps) => {
  // Generate a unique ID if not provided
  const id = React.useId();
  const identifier = backButtonId || `drawer-${id}`

  // Handle back button behavior
  useDrawerBackButton(
    open || false,
    () => onOpenChange?.(false),
    identifier
  )

  // Handle VisualViewport for mobile keyboard
  React.useEffect(() => {
    const setVH = () => {
      const vv = window.visualViewport
      const h = vv ? vv.height : window.innerHeight
      document.documentElement.style.setProperty('--vvh', `${h * 0.01}px`)
    }

    setVH()

    const vv = window.visualViewport
    vv?.addEventListener('resize', setVH)
    vv?.addEventListener('scroll', setVH)
    window.addEventListener('resize', setVH)

    // Handle input blur to catch keyboard dismiss
    const handleBlur = () => {
      // Use setTimeout to ensure keyboard has time to close
      setTimeout(setVH, 100)
      setTimeout(setVH, 300)
    }

    // Listen for all input blur events
    document.addEventListener('focusout', handleBlur)

    return () => {
      vv?.removeEventListener('resize', setVH)
      vv?.removeEventListener('scroll', setVH)
      window.removeEventListener('resize', setVH)
      document.removeEventListener('focusout', handleBlur)
    }
  }, [])

  return (
    <DrawerPrimitive.Root
      shouldScaleBackground={shouldScaleBackground}
      open={open}
      onOpenChange={onOpenChange}
      {...props}
    />
  )
}
Drawer.displayName = "Drawer"

const DrawerTrigger = DrawerPrimitive.Trigger

const DrawerPortal = DrawerPrimitive.Portal

const DrawerClose = DrawerPrimitive.Close

const DrawerOverlay = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Overlay
    ref={ref}
    className={cn("fixed inset-0 z-50 bg-black/80", className)}
    {...props}
  />
))
DrawerOverlay.displayName = DrawerPrimitive.Overlay.displayName

interface DrawerContentProps extends React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Content> {
  halfScreen?: boolean
}

const DrawerContent = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Content>,
  DrawerContentProps
>(({ className, children, halfScreen = false, ...props }, ref) => (
  <DrawerPortal>
    <DrawerOverlay />
    <DrawerPrimitive.Content
      ref={ref}
      className={cn(
        "fixed end-0 bottom-0 z-50 flex w-full flex-col border-s bg-background rounded-t-2xl",
        className
      )}
      style={{
        top: halfScreen ? 'calc(var(--vvh, 1vh) * 50)' : '50px',
        paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))',
      }}
      {...props}
    >
      <div className="mx-auto mt-4 h-1.5 w-12 flex-shrink-0 rounded-full bg-slate-300" />
      <div className="max-w-2xl mx-auto w-full flex flex-col flex-1 min-h-0 overflow-auto">
        {children}
      </div>
    </DrawerPrimitive.Content>
  </DrawerPortal>
))
DrawerContent.displayName = "DrawerContent"

const DrawerHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("sticky top-0 z-10 bg-background grid gap-1.5 p-4 text-center sm:text-start border-b", className)}
    {...props}
  />
)
DrawerHeader.displayName = "DrawerHeader"

const DrawerFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("mt-auto flex flex-col gap-2 p-4", className)}
    {...props}
  />
)
DrawerFooter.displayName = "DrawerFooter"

const DrawerTitle = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
DrawerTitle.displayName = DrawerPrimitive.Title.displayName

const DrawerDescription = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
DrawerDescription.displayName = DrawerPrimitive.Description.displayName

export {
  Drawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
}
