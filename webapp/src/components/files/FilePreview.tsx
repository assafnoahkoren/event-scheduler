import { File, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface FilePreviewProps {
  url: string
  fileName: string
  contentType?: string | null
  onDownload?: () => void
  className?: string
}

export function FilePreview({
  url,
  fileName,
  contentType,
  onDownload,
  className = '',
}: FilePreviewProps) {
  const isImage = contentType?.startsWith('image/')
  const isPdf = contentType?.includes('pdf')

  if (isImage) {
    return (
      <img
        src={url}
        alt={fileName}
        className={`w-full h-full object-contain ${className}`}
      />
    )
  }

  if (isPdf) {
    return (
      <iframe
        src={url}
        className={`w-full h-full border-0 ${className}`}
        title={fileName}
      />
    )
  }

  return (
    <div className={`flex flex-col items-center justify-center h-full text-muted-foreground ${className}`}>
      <File className="h-16 w-16 mb-2" />
      <p className="text-sm mb-4">Preview not available for this file type</p>
      {onDownload && (
        <Button onClick={onDownload}>
          <Download className="h-4 w-4 me-2" />
          Download to view
        </Button>
      )}
    </div>
  )
}
