'use client'

import { SearchResult } from '@/hooks/useSearchCache'
import { useTranslation } from '@/lib/i18n'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Calendar, MapPin, Package, DollarSign, BookOpen, Users, Navigation } from 'lucide-react'

interface SearchPreviewPanelProps {
  result: SearchResult | null
  isLoading?: boolean
}

export function SearchPreviewPanel({ result, isLoading }: SearchPreviewPanelProps) {
  const { t } = useTranslation()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <p className="text-sm text-muted-foreground">{t('search.preview.loading')}</p>
      </div>
    )
  }

  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <div className="rounded-full bg-muted p-3 mb-3">
          <Navigation className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">{t('search.preview.noPreview')}</p>
      </div>
    )
  }

  const renderIcon = () => {
    const iconProps = { className: "h-5 w-5" }
    switch (result.type) {
      case 'user':
        return <Users {...iconProps} />
      case 'shift':
        return <Calendar {...iconProps} />
      case 'recipe':
        return <BookOpen {...iconProps} />
      case 'inventory':
        return <Package {...iconProps} />
      case 'financial':
        return <DollarSign {...iconProps} />
      case 'location':
        return <MapPin {...iconProps} />
      default:
        return <Navigation {...iconProps} />
    }
  }

  return (
    <div className="h-full overflow-y-auto border-l">
      <div className="p-6 space-y-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          {result.type === 'user' && result.metadata?.avatar_url ? (
            <Avatar className="h-12 w-12">
              <AvatarImage src={result.metadata.avatar_url} />
              <AvatarFallback>{result.title[0]}</AvatarFallback>
            </Avatar>
          ) : (
            <div className="rounded-full bg-primary/10 p-3">
              {renderIcon()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg truncate">{result.title}</h3>
            {result.subtitle && (
              <p className="text-sm text-muted-foreground truncate">{result.subtitle}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {t(`search.types.${result.type}`)}
            </p>
          </div>
        </div>

        {/* Description */}
        {result.description && (
          <div className="pt-4 border-t">
            <h4 className="text-sm font-medium mb-2">{t('search.preview.details')}</h4>
            <p className="text-sm text-muted-foreground">{result.description}</p>
          </div>
        )}

        {/* Metadata */}
        {result.metadata && Object.keys(result.metadata).length > 0 && (
          <div className="pt-4 border-t">
            <h4 className="text-sm font-medium mb-2">{t('common.info')}</h4>
            <dl className="space-y-2">
              {Object.entries(result.metadata).map(([key, value]) => {
                if (key === 'avatar_url' || !value) return null
                return (
                  <div key={key} className="flex justify-between text-sm">
                    <dt className="text-muted-foreground capitalize">{key.replace('_', ' ')}:</dt>
                    <dd className="font-medium">{String(value)}</dd>
                  </div>
                )
              })}
            </dl>
          </div>
        )}

        {/* Actions hint */}
        <div className="pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            {t('search.keyboard.select')}
          </p>
        </div>
      </div>
    </div>
  )
}
