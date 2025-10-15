import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, DollarSign, Trash2, Edit } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { trpc } from '@/utils/trpc'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
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
import type { inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from '../../../../server/src/routers/appRouter'
import { PaymentForm, type PaymentFormData } from '@/components/payments/PaymentForm'
import { EventCostsSection } from '@/components/events/EventCostsSection'

type RouterOutput = inferRouterOutputs<AppRouter>
type Payment = RouterOutput['payments']['list'][0]

interface EventFinancesTabProps {
  eventId: string
}

export function EventFinancesTab({ eventId }: EventFinancesTabProps) {
  const { t } = useTranslation()
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null)
  const [deletingPaymentId, setDeletingPaymentId] = useState<string | null>(null)

  const utils = trpc.useUtils()

  // Fetch event to get organization currency
  const { data: event } = trpc.events.get.useQuery(
    { id: eventId },
    { enabled: !!eventId }
  )

  // Fetch payments for the event
  const { data: payments = [], isLoading } = trpc.payments.list.useQuery(
    { eventId },
    { enabled: !!eventId }
  )

  // Create payment mutation
  const createMutation = trpc.payments.create.useMutation({
    onSuccess: () => {
      utils.payments.list.invalidate({ eventId })
      utils.events.calculateCosts.invalidate({ eventId })
      setIsFormOpen(false)
      toast.success(t('payments.createSuccess'))
    },
    onError: (error) => {
      toast.error(error.message || t('payments.createError'))
    },
  })

  // Update payment mutation
  const updateMutation = trpc.payments.update.useMutation({
    onSuccess: () => {
      utils.payments.list.invalidate({ eventId })
      utils.events.calculateCosts.invalidate({ eventId })
      setIsFormOpen(false)
      setEditingPayment(null)
      toast.success(t('payments.updateSuccess'))
    },
    onError: (error) => {
      toast.error(error.message || t('payments.updateError'))
    },
  })

  // Delete payment mutation
  const deleteMutation = trpc.payments.delete.useMutation({
    onSuccess: () => {
      utils.payments.list.invalidate({ eventId })
      utils.events.calculateCosts.invalidate({ eventId })
      setDeletingPaymentId(null)
      toast.success(t('payments.deleteSuccess'))
    },
    onError: (error) => {
      toast.error(error.message || t('payments.deleteError'))
    },
  })

  const handleSubmit = (data: PaymentFormData) => {
    if (editingPayment) {
      updateMutation.mutate({
        id: editingPayment.id,
        ...data,
      })
    } else {
      createMutation.mutate({
        ...data,
        eventId,
      })
    }
  }

  const handleAddPayment = () => {
    setEditingPayment(null)
    setIsFormOpen(true)
  }

  const handleEdit = (payment: Payment) => {
    setEditingPayment(payment)
    setIsFormOpen(true)
  }

  const handleDeleteClick = (paymentId: string) => {
    setDeletingPaymentId(paymentId)
  }

  const confirmDelete = () => {
    if (deletingPaymentId) {
      deleteMutation.mutate({ id: deletingPaymentId })
    }
  }

  const formatCurrency = (amount: number, currency: string) => {
    const currencySymbol = currency === 'ILS' ? '₪' :
                          currency === 'USD' ? '$' :
                          currency === 'EUR' ? '€' :
                          currency === 'GBP' ? '£' :
                          currency
    return `${currencySymbol}${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-muted-foreground">{t('common.loading')}</p>
      </div>
    )
  }

  // Calculate totals by currency
  const totalsByCurrency: Record<string, number> = {}
  payments.forEach(payment => {
    if (!totalsByCurrency[payment.currency]) {
      totalsByCurrency[payment.currency] = 0
    }
    totalsByCurrency[payment.currency] += Number(payment.amount)
  })

  return (
    <div className="space-y-4">
      {/* Event Costs Summary */}
      <EventCostsSection eventId={eventId} />

      {/* Payments Section */}
      <Card className='border-none'>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 pt-0">
          <CardTitle>{t('payments.title')}</CardTitle>
          <Button onClick={handleAddPayment} size="sm">
            <Plus className="h-4 w-4 me-2" />
            {t('payments.addPayment')}
          </Button>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <div className="text-center py-8">
              <DollarSign className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground font-medium mb-1">{t('payments.noPayments')}</p>
              <p className="text-sm text-muted-foreground">{t('payments.noPaymentsDescription')}</p>
            </div>
          ) : (
            <>
              {/* Payments Summary */}
              <div className="mb-4 p-4 bg-muted/50 rounded-md">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{t('payments.totalReceived')}</p>
                    <div className="flex flex-wrap gap-3 mt-1">
                      {Object.entries(totalsByCurrency).map(([currency, total]) => (
                        <p key={currency} className="text-lg font-semibold text-green-600">
                          {formatCurrency(total, currency)}
                        </p>
                      ))}
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {t('payments.paymentsCount', { count: payments.length })}
                  </div>
                </div>
              </div>

              {/* Payments List */}
              <div className="space-y-2">
                {payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between p-3 border rounded-md hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-lg">
                          {formatCurrency(Number(payment.amount), payment.currency)}
                        </span>
                      </div>
                      {payment.description && (
                        <p className="text-sm text-muted-foreground mb-1">{payment.description}</p>
                      )}
                      {payment.recorder && (
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                          <span>
                            {t('payments.recordedBy')}: {
                              payment.recorder.firstName && payment.recorder.lastName
                                ? `${payment.recorder.firstName} ${payment.recorder.lastName}`
                                : payment.recorder.email
                            }
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(payment)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClick(payment.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Payment Form Drawer */}
      <Drawer open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>
              {editingPayment ? t('payments.editPayment') : t('payments.addPayment')}
            </DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-4">
            <PaymentForm
              defaultCurrency={event?.site.organization.defaultCurrency || 'USD'}
              initialData={
                editingPayment
                  ? {
                      amount: Number(editingPayment.amount),
                      currency: editingPayment.currency,
                      description: editingPayment.description || '',
                    }
                  : undefined
              }
              onSubmit={handleSubmit}
              onCancel={() => {
                setIsFormOpen(false)
                setEditingPayment(null)
              }}
              isSubmitting={createMutation.isPending || updateMutation.isPending}
            />
          </div>
        </DrawerContent>
      </Drawer>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingPaymentId} onOpenChange={() => setDeletingPaymentId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('payments.confirmDeleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('payments.confirmDeleteDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
