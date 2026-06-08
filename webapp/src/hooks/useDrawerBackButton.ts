import { useEffect, useRef } from 'react'

/**
 * Hook to handle back button behavior for drawers on mobile
 * When drawer is open, back button will close the drawer instead of navigating
 */
export function useDrawerBackButton(
  isOpen: boolean,
  onClose: () => void,
  identifier?: string
) {
  // Keep the latest onClose in a ref so the effect below depends only on the
  // open/close transition, not on the callback's identity. Callers (and the
  // Drawer wrapper) recreate onClose every render; including it in the deps
  // would re-run this effect on every render, and each cleanup's
  // history.back() fires a popstate that closes the drawer — which made a
  // drawer auto-close whenever something re-rendered it right after opening
  // (e.g. a data fetch resolving on first open).
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!isOpen) return

    // Create a unique identifier for this drawer's history state
    const stateId = identifier || 'drawer'

    // Push a new history state when drawer opens
    window.history.pushState({ [stateId]: true }, '', window.location.href)

    // Handle the popstate event (back button)
    const handlePopState = (event: PopStateEvent) => {
      // Check if we're navigating away from our drawer state
      if (!event.state || !event.state[stateId]) {
        // Close the drawer without navigating further back
        onCloseRef.current()
      }
    }

    // Add the event listener
    window.addEventListener('popstate', handlePopState)

    // Cleanup function
    return () => {
      window.removeEventListener('popstate', handlePopState)

      // If drawer is being closed (not by back button), clean up the history
      if (window.history.state && window.history.state[stateId]) {
        window.history.back()
      }
    }
  }, [isOpen, identifier])
}