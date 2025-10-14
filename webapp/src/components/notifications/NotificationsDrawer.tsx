import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { NotificationsList } from './NotificationsList'

interface NotificationsDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function NotificationsDrawer({ open, onOpenChange }: NotificationsDrawerProps) {

  const handleActivityClick = (activity: any) => {
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
