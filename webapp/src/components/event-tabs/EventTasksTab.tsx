import { Card, CardContent } from '@/components/ui/card'
import { CheckSquare } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export function EventTasksTab() {
  const { t } = useTranslation()

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <CheckSquare className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-muted-foreground text-center">
            Tasks feature coming soon
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
