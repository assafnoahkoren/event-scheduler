import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Minus, Plus } from 'lucide-react'

interface StockStepperProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  label?: string
  /** Display shown below the number, e.g. "counted so far" */
  sublabel?: string
}

export function StockStepper({
  value,
  onChange,
  min = 0,
  max = Infinity,
  label,
  sublabel,
}: StockStepperProps) {
  const { t } = useTranslation()
  const decrement = () => onChange(Math.max(min, value - 1))
  const increment = () => onChange(Math.min(max, value + 1))

  return (
    <div className="flex flex-col items-center gap-2">
      {label && <p className="text-sm text-muted-foreground">{label}</p>}
      <p className="text-7xl font-extrabold tabular-nums leading-none">{value}</p>
      {sublabel && <p className="text-xs text-muted-foreground">{sublabel}</p>}
      <div className="flex gap-3 mt-2">
        <Button
          variant="outline"
          size="icon"
          className="h-16 w-16 rounded-full border-destructive text-destructive hover:bg-destructive/10"
          onClick={decrement}
          disabled={value <= min}
          aria-label={t('stock.common.decrease')}
        >
          <Minus className="h-6 w-6" />
        </Button>
        <Button
          size="icon"
          className="h-16 w-16 rounded-full"
          onClick={increment}
          disabled={value >= max}
          aria-label={t('stock.common.increase')}
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>
    </div>
  )
}
