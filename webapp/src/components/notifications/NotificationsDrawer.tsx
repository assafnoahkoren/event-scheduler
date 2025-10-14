import { useTranslation } from 'react-i18next'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { NotificationsList } from './NotificationsList'
import type { inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from '../../../../server/src/routers/appRouter'

type RouterOutput = inferRouterOutputs<AppRouter>
type Activity = RouterOutput['userActivity']['getOrganizationActivity']['activities'][0]

interface NotificationsDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function NotificationsDrawer({ open, onOpenChange }: NotificationsDrawerProps) {

  const handleActivityClick = (activity: Activity) => {
    // You can add navigation logic here based on activity type and object
    console.log('Activity clicked:', activity)

    // For example, navigate to the related object:
    // if (activity.objectType === 'Event') {
    //   navigate(`/events/${activity.objectId}`)
    //   onOpenChange(false)
    // }
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Notifications</DrawerTitle>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto">
          <NotificationsList onActivityClick={handleActivityClick} />
        </div>
      </DrawerContent>
    </Drawer>
  )
}
