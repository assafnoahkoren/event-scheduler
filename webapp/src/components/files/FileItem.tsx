import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download, Trash2, File, Image, FileText, X, Eye } from 'lucide-react'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { useTranslation } from 'react-i18next'

interface FileItemProps {
  file: {
    id: string
    originalName: string
    contentType?: string | null
    size?: number | null
    createdAt: string
  }
  onDownload: (file: any) => void
  onDelete: (file: any) => void
  onGetPreviewUrl: (fileId: string) => Promise<string>
  isDownloading: boolean
  isDeleting: boolean
}

export function FileItem({
  file,
  onDownload,
  onDelete,
  onGetPreviewUrl,
  isDownloading,
  isDeleting,
}: FileItemProps) {
  const { t } = useTranslation()
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)

  const getFileIcon = (contentType: string) => {
    if (contentType.startsWith('image/')) {
      return <Image className="h-4 w-4" />
    }
    if (contentType.includes('pdf') || contentType.includes('document') || contentType.includes('text')) {
      return <FileText className="h-4 w-4" />
    }
    return <File className="h-4 w-4" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const handlePreview = async () => {
    setIsLoadingPreview(true)
    try {
      const url = await onGetPreviewUrl(file.id)
      setPreviewUrl(url)
      setIsPreviewOpen(true)
    } catch (error) {
      console.error('Failed to get preview URL:', error)
    } finally {
      setIsLoadingPreview(false)
    }
  }

  const handleClosePreview = () => {
    setIsPreviewOpen(false)
    setPreviewUrl(null)
  }

  const isImage = file.contentType?.startsWith('image/')
  const isPdf = file.contentType?.includes('pdf')

  return (
    <>
      <div className="p-3 border rounded-lg space-y-3 cursor-pointer hover:bg-muted/50 transition-colors" onClick={handlePreview}>
        {/* File Info */}
        <div className="flex items-center gap-2">
          {getFileIcon(file.contentType || '')}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{file.originalName}</div>
            <div className="text-xs text-muted-foreground">
              {formatFileSize(file.size || 0)} • {new Date(file.createdAt).toLocaleDateString()}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePreview}
            disabled={isLoadingPreview}
            className="flex-1"
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onDownload(file)}
            disabled={isDownloading}
            className="flex-1"
          >
            <Download className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onDelete(file)}
            disabled={isDeleting}
            className="flex-1 text-destructive hover:bg-destructive hover:text-destructive-foreground"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Preview Drawer */}
      <Drawer open={isPreviewOpen} onOpenChange={handleClosePreview}>
        <DrawerContent className="h-[90vh]">
          <DrawerHeader className="flex flex-row items-center justify-between">
            <DrawerTitle>{file.originalName}</DrawerTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClosePreview}
            >
              <X className="h-4 w-4" />
            </Button>
          </DrawerHeader>
          <div className="flex-1 overflow-auto">
            {isLoadingPreview ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-muted-foreground">{t('common.loading')}</div>
              </div>
            ) : previewUrl ? (
              <div className="flex items-center justify-center h-full">
                {isImage ? (
                  <img
                    src={previewUrl}
                    alt={file.originalName}
                    className="max-w-full max-h-full object-contain"
                  />
                ) : isPdf ? (
                  <iframe
                    src={previewUrl}
                    className="w-full h-full border-0"
                    title={file.originalName}
                  />
                ) : (
                  <div className="text-center space-y-4">
                    <File className="h-16 w-16 mx-auto text-muted-foreground" />
                    <p className="text-muted-foreground">
                      Preview not available for this file type
                    </p>
                    <Button onClick={() => onDownload(file)}>
                      <Download className="h-4 w-4 me-2" />
                      Download to view
                    </Button>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  )
}
