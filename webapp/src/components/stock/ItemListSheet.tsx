import { useTranslation } from 'react-i18next'
import { Check } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

interface ItemEntry {
  itemId: string
  itemName: string
  unit: string
  expectedBalance: number
  counted?: number   // undefined = not yet counted
  isCurrent: boolean
}

interface ItemListSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  items: ItemEntry[]
  onSelectItem: (itemId: string) => void
  locationName: string
}

export function ItemListSheet({
  open,
  onOpenChange,
  items,
  onSelectItem,
  locationName,
}: ItemListSheetProps) {
  const { t } = useTranslation()
  const done = items.filter((i) => i.counted !== undefined).length

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[70vh] flex flex-col">
        <SheetHeader>
          <SheetTitle>
            {locationName} — {t('stock.recount.progressLabel', { done, total: items.length })}
          </SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto mt-4 space-y-2">
          {items.map((entry) => {
            const isDone = entry.counted !== undefined
            const delta = isDone ? entry.counted! - entry.expectedBalance : null

            return (
              <button
                key={entry.itemId}
                className={cn(
                  'w-full flex items-center justify-between p-3 rounded-lg border text-start transition-colors',
                  entry.isCurrent
                    ? 'border-primary bg-primary/10'
                    : isDone
                    ? 'border-green-500/40 bg-green-500/5'
                    : 'border-border hover:bg-muted/50'
                )}
                onClick={() => {
                  onOpenChange(false)
                  onSelectItem(entry.itemId)
                }}
              >
                <div>
                  <p className={cn('font-medium', entry.isCurrent && 'text-primary')}>
                    {entry.itemName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {isDone
                      ? `${t('stock.recount.counted')}: ${entry.counted} · ${t('stock.recount.expected')}: ${entry.expectedBalance}`
                      : `${t('stock.recount.expected')}: ${entry.expectedBalance} ${entry.unit}`}
                  </p>
                </div>
                <div className="shrink-0 ms-3">
                  {entry.isCurrent ? (
                    <span className="text-xs font-bold text-primary">NOW</span>
                  ) : isDone ? (
                    <div className="flex items-center gap-1">
                      {delta !== null && delta !== 0 && (
                        <span className={cn('text-xs font-semibold', delta < 0 ? 'text-destructive' : 'text-green-600')}>
                          {delta > 0 ? '+' : ''}{delta}
                        </span>
                      )}
                      <Check className="h-4 w-4 text-green-500" />
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-xs">→</span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </SheetContent>
    </Sheet>
  )
}
