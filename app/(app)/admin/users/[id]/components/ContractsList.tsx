'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from '@/lib/i18n'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FileText, Plus, Edit, Eye, XCircle, Loader2 } from 'lucide-react'
import { useSupabase } from '@/hooks/useSupabase'
import { toast } from 'sonner'
import { format, isPast, isFuture } from 'date-fns'
import { it } from 'date-fns/locale'
import { ContractFormDialog } from './ContractFormDialog'
import { type UserContract } from '@/lib/types/contracts'
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

interface ContractsListProps {
  userId: string
  userFullName: string
}

export function ContractsList({ userId, userFullName }: ContractsListProps) {
  const supabase = useSupabase()
  const { t } = useTranslation()
  const [contracts, setContracts] = useState<UserContract[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedContract, setSelectedContract] = useState<UserContract | null>(null)
  const [terminateDialogOpen, setTerminateDialogOpen] = useState(false)
  const [contractToTerminate, setContractToTerminate] = useState<UserContract | null>(null)
  const [locationInfo, setLocationInfo] = useState<{ id: string; country: string } | null>(null)

  useEffect(() => {
    loadContracts()
  }, [userId])

  const loadContracts = async () => {
    try {
      setLoading(true)
      
      // Prima carichiamo la location dell'utente per determinare il paese
      const { data: profileData } = await supabase
        .from('profiles')
        .select('default_location_id')
        .eq('id', userId)
        .single()

      if (profileData?.default_location_id) {
        const { data: locationData } = await supabase
          .from('locations')
          .select('id, country')
          .eq('id', profileData.default_location_id)
          .single()

        if (locationData) {
          setLocationInfo(locationData)
        }
      }

      // Poi carichiamo i contratti
      const { data, error } = await supabase
        .from('user_contracts')
        .select('*')
        .eq('user_id', userId)
        .order('start_date', { ascending: false })

      if (error) throw error
      setContracts(data || [])
    } catch (error) {
      console.error('Error loading contracts:', error)
      toast.error(t('contracts.messages.loadError'))
    } finally {
      setLoading(false)
    }
  }

  const getContractStatus = (contract: UserContract) => {
    if (contract.terminated_at) return 'terminated'
    if (!contract.is_active) return 'inactive'
    
    const now = new Date()
    const startDate = new Date(contract.start_date)
    
    if (isFuture(startDate)) return 'future'
    if (contract.end_date && isPast(new Date(contract.end_date))) return 'expired'
    
    return 'active'
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default">{t('contracts.status.active')}</Badge>
      case 'future':
        return <Badge variant="secondary">{t('contracts.status.future')}</Badge>
      case 'expired':
        return <Badge variant="outline">{t('contracts.status.expired')}</Badge>
      case 'terminated':
        return <Badge variant="destructive">{t('contracts.status.terminated')}</Badge>
      default:
        return <Badge variant="secondary">{t('contracts.status.inactive')}</Badge>
    }
  }

  const handleNewContract = () => {
    setSelectedContract(null)
    setDialogOpen(true)
  }

  const handleEditContract = (contract: UserContract) => {
    setSelectedContract(contract)
    setDialogOpen(true)
  }

  const handleTerminateClick = (contract: UserContract) => {
    setContractToTerminate(contract)
    setTerminateDialogOpen(true)
  }

  const handleTerminateConfirm = async () => {
    if (!contractToTerminate) return

    try {
      const { error } = await supabase
        .from('user_contracts')
        .update({
          is_active: false,
          terminated_at: new Date().toISOString(),
        })
        .eq('id', contractToTerminate.id)

      if (error) throw error

      toast.success(t('contracts.messages.terminateSuccess'))
      loadContracts()
    } catch (error: any) {
      console.error('Error terminating contract:', error)
      toast.error(error.message || t('contracts.messages.terminateError'))
    } finally {
      setTerminateDialogOpen(false)
      setContractToTerminate(null)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  const activeContracts = contracts.filter(c => getContractStatus(c) === 'active')
  const historicalContracts = contracts.filter(c => getContractStatus(c) !== 'active')

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {t('contracts.title')}
              </CardTitle>
              <CardDescription>
                {t('contracts.subtitle').replace('{userFullName}', userFullName)}
              </CardDescription>
            </div>
            <Button onClick={handleNewContract} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              {t('contracts.actions.newContract')}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {contracts.length === 0 ? (
            <div className="text-center py-8 space-y-3">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto" />
              <div>
                <h3 className="text-sm font-medium">{t('contracts.empty.title')}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('contracts.empty.description')}
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Contratti Attivi */}
              {activeContracts.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">{t('contracts.sections.activeContracts')}</h3>
                  {activeContracts.map((contract) => (
                    <ContractCard
                      key={contract.id}
                      contract={contract}
                      status={getContractStatus(contract)}
                      onEdit={handleEditContract}
                      onTerminate={handleTerminateClick}
                      statusBadge={getStatusBadge(getContractStatus(contract))}
                    />
                  ))}
                </div>
              )}

              {/* Storico Contratti */}
              {historicalContracts.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground">{t('contracts.sections.historical')}</h3>
                  {historicalContracts.map((contract) => (
                    <ContractCard
                      key={contract.id}
                      contract={contract}
                      status={getContractStatus(contract)}
                      onEdit={handleEditContract}
                      onTerminate={handleTerminateClick}
                      statusBadge={getStatusBadge(getContractStatus(contract))}
                      isHistorical
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <ContractFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        userId={userId}
        locationId={locationInfo?.id || ''}
        locationCountry={locationInfo?.country}
        contract={selectedContract}
        onSuccess={loadContracts}
      />

      <AlertDialog open={terminateDialogOpen} onOpenChange={setTerminateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('contracts.dialogs.terminateTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('contracts.dialogs.terminateDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('contracts.actions.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleTerminateConfirm}>
              {t('contracts.actions.terminateContract')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

interface ContractCardProps {
  contract: UserContract
  status: string
  onEdit: (contract: UserContract) => void
  onTerminate: (contract: UserContract) => void
  statusBadge: React.ReactNode
  isHistorical?: boolean
}

function ContractCard({ contract, status, onEdit, onTerminate, statusBadge, isHistorical }: ContractCardProps) {
  const { t } = useTranslation()
  
  return (
      <div className="border rounded-lg p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2">
              <h4 className="font-medium">{contract.job_title || t('contracts.display.positionNotSpecified')}</h4>
              {statusBadge}
              {contract.is_forfait_journalier && (
                <Badge variant="secondary">{t('contracts.display.forfait')}</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {contract.contract_type}
              {!contract.is_forfait_journalier && ` • ${contract.weekly_hours}${t('contracts.display.hoursPerWeek')}`}
            </p>
            <p className="text-xs text-muted-foreground">
              {format(new Date(contract.start_date), 'PPP', { locale: it })}
              {contract.end_date && ` - ${format(new Date(contract.end_date), 'PPP', { locale: it })}`}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onEdit(contract)}
              disabled={status === 'terminated'}
            >
              {status === 'active' ? <Edit className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
            {status === 'active' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onTerminate(contract)}
              >
                <XCircle className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Dettagli Contratto */}
        <div className="grid grid-cols-2 gap-3 text-sm pt-2 border-t">
          <div>
            <span className="text-muted-foreground">{t('contracts.display.remuneration')}:</span>
            <span className="ml-2 font-medium">
              {contract.is_forfait_journalier && contract.daily_rate
                ? `€${contract.daily_rate}${t('contracts.display.perDay')}`
                : contract.monthly_salary 
                ? `€${contract.monthly_salary}${t('contracts.display.perMonth')}`
                : contract.hourly_rate 
                ? `€${contract.hourly_rate}${t('contracts.display.perHour')}`
                : t('contracts.display.notSpecified')
              }
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">{t('contracts.display.daysPerWeek')}:</span>
            <span className="ml-2 font-medium">{contract.working_days_per_week}</span>
          </div>
          {contract.collective_agreement && (
            <div className="col-span-2">
              <span className="text-muted-foreground">{t('contracts.display.ccnl')}:</span>
              <span className="ml-2 font-medium">{contract.collective_agreement}</span>
            </div>
          )}
          {contract.niveau && (
            <div>
              <span className="text-muted-foreground">{t('contracts.display.niveau')}:</span>
              <span className="ml-2 font-medium">{contract.niveau}</span>
            </div>
          )}
          {contract.echelon && (
            <div>
              <span className="text-muted-foreground">{t('contracts.display.echelon')}:</span>
              <span className="ml-2 font-medium">{contract.echelon}</span>
            </div>
          )}
          {contract.coefficient && (
            <div>
              <span className="text-muted-foreground">{t('contracts.display.coefficient')}:</span>
              <span className="ml-2 font-medium">{contract.coefficient}</span>
            </div>
          )}
        </div>

        {contract.terminated_at && (
          <p className="text-xs text-destructive pt-2 border-t">
            {t('contracts.display.terminatedOn')} {format(new Date(contract.terminated_at), 'PPP', { locale: it })}
          </p>
        )}
      </div>
  )
}
