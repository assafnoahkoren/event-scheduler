import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Warehouse, ArrowRightLeft, ClipboardList } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MoveStockSheet } from '@/components/stock/MoveStockSheet'
import { RecountFlow } from '@/components/stock/RecountFlow'
import { useCurrentSite } from '@/contexts/CurrentSiteContext'

export function StockPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { currentSite } = useCurrentSite()
  const [moveOpen, setMoveOpen] = useState(false)
  const [recountOpen, setRecountOpen] = useState(false)

  if (!currentSite) return null

  const actions = [
    {
      label: t('stock.actions.moveStock'),
      icon: ArrowRightLeft,
      color: 'bg-amber-500 hover:bg-amber-600',
      onClick: () => setMoveOpen(true),
    },
    {
      label: t('stock.actions.recount'),
      icon: ClipboardList,
      color: 'bg-blue-500 hover:bg-blue-600',
      onClick: () => setRecountOpen(true),
    },
  ]

  return (
    <div className="container mx-auto px-4 py-6 max-w-lg">
      <div className="flex items-center gap-2 mb-6">
        <Warehouse className="h-6 w-6" />
        <h1 className="text-2xl font-bold">{t('stock.title')}</h1>
      </div>

      {/* Primary actions */}
      <div className="grid gap-4 mb-8">
        {actions.map((action) => (
          <button
            key={action.label}
            onClick={action.onClick}
            className={`flex items-center gap-4 p-5 rounded-xl text-white font-semibold text-lg text-start transition-colors ${action.color}`}
          >
            <action.icon className="h-7 w-7 shrink-0" />
            {action.label}
          </button>
        ))}
      </div>

      {/* Secondary navigation */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: t('stock.levels'), path: '/stock/levels' },
          { label: t('stock.orders'), path: '/stock/orders' },
          { label: t('stock.settings'), path: '/stock/settings' },
        ].map((link) => (
          <Button
            key={link.path}
            variant="outline"
            className="h-14 text-sm"
            onClick={() => navigate(link.path)}
          >
            {link.label}
          </Button>
        ))}
      </div>

      <MoveStockSheet siteId={currentSite.id} open={moveOpen} onOpenChange={setMoveOpen} />
      {recountOpen && (
        <RecountFlow siteId={currentSite.id} onClose={() => setRecountOpen(false)} />
      )}
    </div>
  )
}
