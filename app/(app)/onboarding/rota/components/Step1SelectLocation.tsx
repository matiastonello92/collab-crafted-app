'use client'

import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { MapPin, AlertCircle } from 'lucide-react'
import { useTranslation } from '@/lib/i18n'

interface Location {
  id: string
  name: string
}

interface Step1Props {
  locations: Location[]
  selectedLocation: string | null
  onLocationChange: (locationId: string) => void
  onNext: () => void
  loading: boolean
}

export function Step1SelectLocation({
  locations,
  selectedLocation,
  onLocationChange,
  onNext,
  loading,
}: Step1Props) {
  const { t } = useTranslation()
  
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">{t('onboarding.step1.loading')}</p>
      </div>
    )
  }

  if (locations.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {t('onboarding.step1.noAccess')}
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">{t('onboarding.step1.title')}</h2>
        <p className="text-muted-foreground">
          {t('onboarding.step1.description')}
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">{t('onboarding.step1.locationLabel')}</label>
          <Select value={selectedLocation || ''} onValueChange={onLocationChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t('onboarding.step1.locationPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              {locations.map((location) => (
                <SelectItem key={location.id} value={location.id}>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {location.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={onNext} disabled={!selectedLocation}>
          {t('onboarding.step1.nextButton')}
        </Button>
      </div>
    </div>
  )
}
