import { Card, CardContent } from '@/components/ui/card'
import { DollarSign } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export function EventFinancesTab() {
  const { t } = useTranslation()

  return (
    <div className="space-y-4 px-6">
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <DollarSign className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-muted-foreground text-center">
            Finances feature coming soon
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
