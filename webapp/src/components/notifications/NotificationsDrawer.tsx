import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { NotificationsList } from './NotificationsList'
import { useTranslation } from 'react-i18next'
import { trpc } from '@/utils/trpc'

interface NotificationsDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function NotificationsDrawer({ open, onOpenChange }: NotificationsDrawerProps) {
  const { t } = useTranslation()
  const utils = trpc.useUtils()

  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen)

    // When closing the drawer, invalidate the unviewed count to update the badge
    if (!newOpen) {
      utils.userActivity.getUnviewedCount.invalidate()
    }
  }

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{t('notifications.title')}</DrawerTitle>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto">
          <NotificationsList onClose={() => onOpenChange(false)} />
        </div>
      </DrawerContent>
    </Drawer>
  )
}
