import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { trpc } from '@/utils/trpc'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Upload,
  File,
  Image,
  FileText,
  AlertCircle,
} from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { FileItem } from './FileItem'

interface FileManagerProps {
  objectId: string
  objectType: 'event' | 'service' | 'serviceProvider' | 'user' | 'organization' | 'site'
  relation: 'attachment' | 'photo' | 'document' | 'image' | 'contract' | 'avatar' | 'logo' | 'banner'
  title?: string
  className?: string
}

export function FileManager({
  objectId,
  objectType,
  relation,
  title = 'Files',
  className
}: FileManagerProps) {
  const { t } = useTranslation()
  const [uploadingFiles, setUploadingFiles] = useState<File[]>([])
  const [fileToDelete, setFileToDelete] = useState<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fetch files
  const { data: filesData, isLoading: isLoadingFiles } = trpc.files.getForObject.useQuery({
    objectType,
    objectId,
    relation,
  })

  const utils = trpc.useUtils()

  // Mutations
  const getUploadUrlMutation = trpc.files.getUploadUrl.useMutation()
  const confirmUploadMutation = trpc.files.confirmUpload.useMutation({
    onSuccess: () => {
      utils.files.getForObject.invalidate({ objectType, objectId, relation })
      setUploadingFiles([])
      toast.success(t('files.fileUploadedSuccessfully'))
    },
    onError: (error) => {
      toast.error(error.message)
      setUploadingFiles([])
    }
  })

  const getSignedUrlMutation = trpc.files.getSignedUrl.useMutation({
    onSuccess: async (data, variables) => {
      // Find the file to get the original name
      const file = files.find((f: any) => f.id === variables.fileId)
      const fileName = file?.originalName || 'download'

      try {
        // Fetch the file as a blob
        const response = await fetch(data.url)
        const blob = await response.blob()

        // Create a blob URL and trigger download
        const blobUrl = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = blobUrl
        link.download = fileName
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)

        // Clean up the blob URL
        window.URL.revokeObjectURL(blobUrl)
      } catch (error) {
        console.error('Download failed:', error)
        toast.error('Failed to download file')
      }
    },
    onError: (error) => {
      toast.error(error.message)
    }
  })

  // Separate mutation for preview (no automatic download)
  const getPreviewUrlMutation = trpc.files.getSignedUrl.useMutation({
    onError: (error) => {
      toast.error(error.message)
    }
  })

  const deleteMutation = trpc.files.delete.useMutation({
    onSuccess: () => {
      utils.files.getForObject.invalidate({ objectType, objectId, relation })
      setFileToDelete(null)
      toast.success(t('files.fileDeletedSuccessfully'))
    },
    onError: (error) => {
      toast.error(error.message)
      setFileToDelete(null)
    }
  })

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    const fileArray = Array.from(files)
    setUploadingFiles(fileArray)

    try {
      for (const file of fileArray) {
        // Get pre-signed upload URL
        const uploadData = await getUploadUrlMutation.mutateAsync({
          fileName: file.name,
          contentType: file.type,
          objectType,
          objectId,
          relation,
        })

        // Upload directly to S3
        const response = await fetch(uploadData.uploadUrl, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': file.type,
          },
        })

        if (!response.ok) {
          throw new Error(`Upload failed: ${response.statusText}`)
        }

        // Confirm upload
        await confirmUploadMutation.mutateAsync({
          key: uploadData.key,
          originalName: file.name,
          size: file.size,
          contentType: file.type,
          objectType,
          objectId,
          relation,
        })
      }
    } catch (error) {
      console.error('Upload error:', error)
      toast.error(error instanceof Error ? error.message : 'Unknown error occurred')
      setUploadingFiles([])
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleDownload = (file: any) => {
    getSignedUrlMutation.mutate({
      fileId: file.id,
      expiresIn: 3600, // 1 hour
    })
  }

  const handleDelete = (file: any) => {
    setFileToDelete(file)
  }

  const handleGetPreviewUrl = async (fileId: string): Promise<string> => {
    const result = await getPreviewUrlMutation.mutateAsync({
      fileId,
      expiresIn: 3600, // 1 hour
    })
    return result.url
  }

  const confirmDelete = () => {
    if (fileToDelete) {
      deleteMutation.mutate({ fileId: fileToDelete.id })
    }
  }

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

  const files = filesData?.files || []
  const isUploading = uploadingFiles.length > 0

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{title}</span>
          <Badge variant="secondary">
            {files.length} {files.length === 1 ? t('files.file') : t('files.files')}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload Button */}
        <div className="flex justify-between items-center">
          <h4 className="text-sm font-medium">{t('files.uploadFiles')}</h4>
          <Button
            type="button"
            onClick={handleUploadClick}
            disabled={isUploading}
            size="sm"
          >
            <Upload className="h-4 w-4 me-2" />
            {isUploading ? t('files.uploading') : t('files.selectFiles')}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            style={{ display: 'none' }}
            accept="image/*,application/pdf,.doc,.docx,.txt"
          />
        </div>

        {/* Uploading Files */}
        {uploadingFiles.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">{t('files.uploadingFiles')}</h4>
            {uploadingFiles.map((file, index) => (
              <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded">
                {getFileIcon(file.type)}
                <span className="text-sm flex-1">{file.name}</span>
                <Badge variant="secondary">{formatFileSize(file.size)}</Badge>
              </div>
            ))}
          </div>
        )}

        {/* Files List */}
        {isLoadingFiles ? (
          <div className="text-center py-4">
            <div className="text-sm text-muted-foreground">{t('common.loading')}</div>
          </div>
        ) : files.length > 0 ? (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">{t('files.uploadedFiles')}</h4>
            {files.map((file: any) => (
              <FileItem
                key={file.id}
                file={file}
                onDownload={handleDownload}
                onDelete={handleDelete}
                onGetPreviewUrl={handleGetPreviewUrl}
                isDownloading={getSignedUrlMutation.isPending}
                isDeleting={deleteMutation.isPending}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <File className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">{t('files.noFiles')}</p>
          </div>
        )}

        {/* Upload progress/errors */}
        {getUploadUrlMutation.error && (
          <div className="flex items-center gap-2 p-2 bg-destructive/10 text-destructive rounded">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{getUploadUrlMutation.error.message}</span>
          </div>
        )}
      </CardContent>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!fileToDelete} onOpenChange={(open) => !open && setFileToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('files.confirmDelete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('files.confirmDeleteDescription', { fileName: fileToDelete?.originalName })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? t('common.deleting') : t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}