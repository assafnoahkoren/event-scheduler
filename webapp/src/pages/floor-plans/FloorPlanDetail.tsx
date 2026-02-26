import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { trpc } from '@/utils/trpc'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { ArrowLeft, Upload, Trash2, Image, Save, Loader2, Plus, Layout, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { CalibrationTool } from '@/components/floor-plans/CalibrationTool'
import { useSignedUrl } from '@/hooks/useSignedUrl'

export function FloorPlanDetail() {
  const { floorPlanId } = useParams<{ floorPlanId: string }>()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [initialized, setInitialized] = useState(false)
  const [showNewTemplateDialog, setShowNewTemplateDialog] = useState(false)
  const [newTemplateName, setNewTemplateName] = useState('')

  const utils = trpc.useUtils()

  const { data: floorPlan, isLoading, error } = trpc.floorPlans.siteFloorPlans.get.useQuery(
    { id: floorPlanId! },
    { enabled: !!floorPlanId }
  )

  // Get signed URL for the image - must be called before any early returns
  const { signedUrl: imageUrl, isLoading: isLoadingImage } = useSignedUrl({
    fileId: floorPlan?.imageFile?.id,
  })

  // Initialize name when data loads
  useEffect(() => {
    if (floorPlan && !initialized) {
      setName(floorPlan.name)
      setInitialized(true)
    }
  }, [floorPlan, initialized])

  const updateMutation = trpc.floorPlans.siteFloorPlans.update.useMutation({
    onSuccess: () => {
      toast.success(t('floorPlans.updateSuccess'))
      utils.floorPlans.siteFloorPlans.get.invalidate({ id: floorPlanId! })
      utils.floorPlans.siteFloorPlans.list.invalidate()
      setHasChanges(false)
    },
    onError: (error) => {
      toast.error(t('floorPlans.updateError'), { description: error.message })
    },
  })

  const deleteMutation = trpc.floorPlans.siteFloorPlans.delete.useMutation({
    onSuccess: () => {
      toast.success(t('floorPlans.deleteSuccess'))
      navigate('/floor-plans')
    },
    onError: (error) => {
      toast.error(t('floorPlans.deleteError'), { description: error.message })
    },
  })

  // File upload mutations
  const getUploadUrlMutation = trpc.files.getUploadUrl.useMutation()
  const confirmUploadMutation = trpc.files.confirmUpload.useMutation({
    onSuccess: (data) => {
      // Update the floor plan with the new image
      updateMutation.mutate({
        id: floorPlanId!,
        imageFileId: data.id,
      })
      setIsUploading(false)
    },
    onError: (error) => {
      toast.error(t('files.uploadError'), { description: error.message })
      setIsUploading(false)
    },
  })

  const createTemplateMutation = trpc.floorPlans.templates.create.useMutation({
    onSuccess: (data) => {
      toast.success(t('componentTypes.createSuccess'))
      setShowNewTemplateDialog(false)
      setNewTemplateName('')
      utils.floorPlans.siteFloorPlans.get.invalidate({ id: floorPlanId! })
      navigate(`/templates/${data.id}`)
    },
    onError: (error) => {
      toast.error(t('componentTypes.createError'), { description: error.message })
    },
  })

  const handleNameChange = (newName: string) => {
    setName(newName)
    setHasChanges(newName !== floorPlan?.name)
  }

  const handleSave = () => {
    if (!floorPlanId || !name.trim()) return
    updateMutation.mutate({
      id: floorPlanId,
      name: name.trim(),
    })
  }

  const handleDelete = () => {
    if (!floorPlanId) return
    deleteMutation.mutate({ id: floorPlanId })
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0 || !floorPlan) return

    const file = files[0]
    setIsUploading(true)

    try {
      // Get pre-signed upload URL
      const uploadData = await getUploadUrlMutation.mutateAsync({
        fileName: file.name,
        contentType: file.type,
        objectType: 'siteFloorPlan',
        objectId: floorPlan.id,
        relation: 'image',
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
        objectType: 'siteFloorPlan',
        objectId: floorPlan.id,
        relation: 'image',
      })
    } catch (error) {
      console.error('Upload error:', error)
      toast.error(error instanceof Error ? error.message : 'Upload failed')
      setIsUploading(false)
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleRemoveImage = () => {
    if (!floorPlanId) return
    updateMutation.mutate({
      id: floorPlanId,
      imageFileId: null,
    })
  }

  const handleCreateTemplate = () => {
    if (!floorPlanId || !newTemplateName.trim()) return
    createTemplateMutation.mutate({
      floorPlanId,
      name: newTemplateName.trim(),
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !floorPlan) {
    return (
      <div className="container mx-auto px-4 py-4 max-w-4xl">
        <div className="text-center py-16">
          <p className="text-muted-foreground">{t('common.error')}</p>
          <p className="text-sm text-red-600 mt-2">{error?.message || 'Floor plan not found'}</p>
          <Button variant="outline" onClick={() => navigate('/floor-plans')} className="mt-4">
            <ArrowLeft className="h-4 w-4 me-2 rtl:rotate-180" />
            {t('common.back')}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-4 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate('/floor-plans')}>
          <ArrowLeft className="h-5 w-5 rtl:rotate-180" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{floorPlan.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={floorPlan.pixelsPerMeter ? 'default' : 'secondary'}>
              {floorPlan.pixelsPerMeter ? t('floorPlans.calibrated') : t('floorPlans.notCalibrated')}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {floorPlan.templates?.length || 0} {t('floorPlans.templates')}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Floor Plan Image */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{t('floorPlans.floorPlan')}</span>
              <div className="flex gap-2">
                {floorPlan.imageFile && (
                  <>
                    {imageUrl && (
                      <CalibrationTool
                        floorPlanId={floorPlanId!}
                        imageUrl={imageUrl}
                        currentPixelsPerMeter={floorPlan.pixelsPerMeter}
                        onCalibrated={() => {}}
                      />
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRemoveImage}
                      disabled={updateMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 me-2" />
                      {t('common.delete')}
                    </Button>
                  </>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  <Upload className="h-4 w-4 me-2" />
                  {isUploading ? t('files.uploading') : t('files.upload')}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {floorPlan.imageFile ? (
              <div className="relative rounded-lg overflow-hidden border bg-muted">
                {isLoadingImage ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={floorPlan.name}
                    className="w-full h-auto max-h-[500px] object-contain"
                  />
                ) : (
                  <div className="flex items-center justify-center py-16">
                    <p className="text-muted-foreground">{t('common.error')}</p>
                  </div>
                )}
              </div>
            ) : (
              <div
                className="flex flex-col items-center justify-center py-16 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Image className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-2">{t('floorPlans.noFloorPlansDescription')}</p>
                <Button variant="outline" size="sm">
                  <Upload className="h-4 w-4 me-2" />
                  {t('files.upload')}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Settings */}
        <Card>
          <CardHeader>
            <CardTitle>{t('navigation.settings')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t('floorPlans.name')}</Label>
              <div className="flex gap-2">
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder={t('floorPlans.namePlaceholder')}
                />
                <Button
                  onClick={handleSave}
                  disabled={!hasChanges || updateMutation.isPending}
                >
                  {updateMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Templates */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{t('floorPlans.templates')}</span>
              <Button
                size="sm"
                onClick={() => setShowNewTemplateDialog(true)}
                disabled={!floorPlan.imageFile || !floorPlan.pixelsPerMeter}
              >
                <Plus className="h-4 w-4 me-2" />
                {t('templateEditor.newTemplate')}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!floorPlan.imageFile ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t('floorPlans.noFloorPlansDescription')}
              </p>
            ) : !floorPlan.pixelsPerMeter ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t('floorPlans.notCalibrated')} - {t('floorPlans.calibrationInstructions')}
              </p>
            ) : floorPlan.templates && floorPlan.templates.length > 0 ? (
              <div className="space-y-2">
                {floorPlan.templates.map((template) => (
                  <div
                    key={template.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/templates/${template.id}`)}
                  >
                    <div className="flex items-center gap-3">
                      <Layout className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{template.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {template.components?.length || 0} {t('templateEditor.components').toLowerCase()}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground rtl:rotate-180" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Layout className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-2">{t('templateEditor.noTemplates')}</p>
                <p className="text-sm text-muted-foreground">{t('templateEditor.noTemplatesDescription')}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive">{t('events.dangerZone')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{t('floorPlans.deleteFloorPlan')}</p>
                <p className="text-sm text-muted-foreground">
                  {t('floorPlans.confirmDeleteDescription')}
                </p>
              </div>
              <Button
                variant="destructive"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="h-4 w-4 me-2" />
                {t('common.delete')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('floorPlans.confirmDeleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('floorPlans.confirmDeleteDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? t('common.deleting') : t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* New Template Dialog */}
      <Dialog open={showNewTemplateDialog} onOpenChange={setShowNewTemplateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('templateEditor.createTemplate')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="templateName">{t('templateEditor.templateName')}</Label>
              <Input
                id="templateName"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                placeholder={t('templateEditor.templateNamePlaceholder')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newTemplateName.trim()) {
                    handleCreateTemplate()
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewTemplateDialog(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleCreateTemplate}
              disabled={!newTemplateName.trim() || createTemplateMutation.isPending}
            >
              {createTemplateMutation.isPending ? (
                <Loader2 className="h-4 w-4 me-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 me-2" />
              )}
              {t('common.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
