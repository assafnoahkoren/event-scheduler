import { FileManager } from '@/components/files/FileManager'
import { useTranslation } from 'react-i18next'

interface EventFilesTabProps {
  eventId: string
}

export function EventFilesTab({ eventId }: EventFilesTabProps) {
  const { t } = useTranslation()

  return (
    <div className="space-y-4 px-6">
      <FileManager
        objectId={eventId}
        objectType="event"
        relation="attachment"
        title={t('files.title')}
      />
    </div>
  )
}
