import { Button } from '@/components/ui/button'
import { useDirection } from '@/contexts/DirectionContext'
import { Languages } from 'lucide-react'

export function DirectionToggle() {
  const { direction, toggleDirection } = useDirection()

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={toggleDirection}
      title={direction === 'ltr' ? 'Switch to RTL' : 'Switch to LTR'}
    >
      <Languages className="h-4 w-4" />
      <span className="sr-only">
        {direction === 'ltr' ? 'Switch to RTL' : 'Switch to LTR'}
      </span>
    </Button>
  )
}