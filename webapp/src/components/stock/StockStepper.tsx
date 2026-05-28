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

  const decrementBy = (amount: number) => onChange(Math.max(min, value - amount))
  const incrementBy = (amount: number) => onChange(Math.min(max, value + amount))

  return (
    <div className="flex flex-col items-center gap-2">
      {label && <p className="text-sm text-muted-foreground">{label}</p>}
      <p className="text-7xl font-extrabold tabular-nums leading-none">{value}</p>
      {sublabel && <p className="text-xs text-muted-foreground">{sublabel}</p>}
      <div className="flex items-center gap-2 mt-2">
        <Button
          variant="outline"
          size="sm"
          className="h-10 w-12 rounded-full border-destructive text-destructive hover:bg-destructive/10 text-xs font-semibold"
          onClick={() => decrementBy(10)}
          disabled={value - 10 < min}
          aria-label={t('stock.common.decreaseBy', { amount: 10 })}
        >
          -10
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-10 w-12 rounded-full border-destructive text-destructive hover:bg-destructive/10 text-xs font-semibold"
          onClick={() => decrementBy(5)}
          disabled={value - 5 < min}
          aria-label={t('stock.common.decreaseBy', { amount: 5 })}
        >
          -5
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-16 w-16 rounded-full border-destructive text-destructive hover:bg-destructive/10 [&_svg]:size-8"
          onClick={decrement}
          disabled={value <= min}
          aria-label={t('stock.common.decrease')}
        >
          <Minus className="h-8 w-8" />
        </Button>
        <Button
          size="icon"
          className="h-16 w-16 rounded-full [&_svg]:size-8"
          onClick={increment}
          disabled={value >= max}
          aria-label={t('stock.common.increase')}
        >
          <Plus className="h-8 w-8" />
        </Button>
        <Button
          size="sm"
          className="h-10 w-12 rounded-full text-xs font-semibold"
          onClick={() => incrementBy(5)}
          disabled={value + 5 > max}
          aria-label={t('stock.common.increaseBy', { amount: 5 })}
        >
          +5
        </Button>
        <Button
          size="sm"
          className="h-10 w-12 rounded-full text-xs font-semibold"
          onClick={() => incrementBy(10)}
          disabled={value + 10 > max}
          aria-label={t('stock.common.increaseBy', { amount: 10 })}
        >
          +10
        </Button>
      </div>
    </div>
  )
}
