import { useState } from 'react'
import { MoreVertical } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer'

export interface ActionItem {
  id: string
  label: string
  icon?: React.ComponentType<{ className?: string }>
  onClick: () => void
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  disabled?: boolean
}

interface MoreProps {
  title: string
  actions: ActionItem[]
  size?: 'sm' | 'default' | 'lg'
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  className?: string
}

export function More({
  title,
  actions,
  size = 'sm',
  variant = 'ghost',
  className = ''
}: MoreProps) {
  const [isOpen, setIsOpen] = useState(false)
  const { t } = useTranslation()

  const handleClick = () => {
    setIsOpen(true)
  }

  const handleActionClick = (action: ActionItem) => {
    action.onClick()
    setIsOpen(false)
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={handleClick}
        className={className}
      >
        <MoreVertical className="w-4 h-4" />
      </Button>

      <Drawer open={isOpen} onOpenChange={setIsOpen}>
        <DrawerContent halfScreen>
          <DrawerHeader>
            <DrawerTitle>{title}</DrawerTitle>
            <DrawerDescription>
              {t('common.selectAction')}
            </DrawerDescription>
          </DrawerHeader>
          <div className="flex flex-col gap-2 p-4 pt-0">
            {actions.map((action) => (
              <Button
                key={action.id}
                variant={action.variant || 'ghost'}
                onClick={() => handleActionClick(action)}
                disabled={action.disabled}
                className="justify-center h-12"
              >
                {action.icon && (
                  <action.icon className="w-4 h-4 me-2" />
                )}
                {action.label}
              </Button>
            ))}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  )
}