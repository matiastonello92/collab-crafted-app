'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from '@/components/ui/command'
import { useTranslation } from '@/lib/i18n'
import { useHydratedContext } from '@/lib/store/useHydratedStore'
import { usePermissions } from '@/hooks/usePermissions'
import { checkPermission } from '@/lib/permissions/unified'
import { useSearchCache, SearchResult } from '@/hooks/useSearchCache'
import { getRecentSearches, addRecentSearch, clearRecentSearches, RecentSearchItem } from '@/lib/search/recentAccess'
import { Users, Calendar, BookOpen, Package, DollarSign, MapPin, Navigation, Clock, Sparkles, Search } from 'lucide-react'
import { useDebounce } from '@/hooks/useDebounce'

const typeIcons = {
  user: Users,
  shift: Calendar,
  recipe: BookOpen,
  inventory: Package,
  financial: DollarSign,
  location: MapPin,
  navigation: Navigation,
}

interface GlobalSearchCommandProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function GlobalSearchCommand({ open, onOpenChange }: GlobalSearchCommandProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const { org_id, location_id } = useHydratedContext()
  const { permissions } = usePermissions(location_id || undefined)
  
  const [query, setQuery] = useState('')
  const [recentSearches, setRecentSearches] = useState<RecentSearchItem[]>([])
  
  const debouncedQuery = useDebounce(query, 300)
  const { results, isLoading } = useSearchCache(debouncedQuery, open && debouncedQuery.length >= 2)

  // Load recent searches on mount
  useEffect(() => {
    if (open) {
      setRecentSearches(getRecentSearches())
    }
  }, [open])

  // Filter results based on permissions
  const filteredResults = useMemo(() => {
    return results.filter(result => {
      switch (result.type) {
        case 'user':
          return checkPermission(permissions, 'manage_users')
        case 'shift':
          return checkPermission(permissions, ['shifts:view', 'shifts:manage'])
        case 'recipe':
          return checkPermission(permissions, ['recipes:view', 'recipes:manage'])
        case 'inventory':
          return checkPermission(permissions, ['inventory:view', 'inventory:manage'])
        case 'financial':
          return checkPermission(permissions, ['finance:view', 'finance:manage'])
        case 'location':
          return checkPermission(permissions, ['edit_locations', 'view_settings'])
        case 'navigation':
          return true // Navigation items are always visible
        default:
          return false
      }
    })
  }, [results, permissions])

  // Contextual suggestions based on time/day
  const contextualSuggestions = useMemo(() => {
    if (!org_id || !location_id) return []
    
    const hour = new Date().getHours()
    const day = new Date().getDay()
    const suggestions: SearchResult[] = []

    // Morning suggestions (6-12)
    if (hour >= 6 && hour < 12 && checkPermission(permissions, 'shifts:manage')) {
      suggestions.push({
        id: 'morning-shifts',
        type: 'navigation',
        title: t('search.contextual.morning'),
        subtitle: t('search.actions.createShift'),
        url: '/shifts/create',
      })
    }

    // Friday suggestions
    if (day === 5 && checkPermission(permissions, 'finance:view')) {
      suggestions.push({
        id: 'friday-reports',
        type: 'navigation',
        title: t('search.contextual.friday'),
        subtitle: t('search.actions.viewReports'),
        url: '/reports',
      })
    }

    return suggestions
  }, [org_id, location_id, permissions, t])

  const handleSelect = useCallback((result: SearchResult | RecentSearchItem) => {
    // Add to recent searches
    addRecentSearch({
      id: result.id,
      type: result.type,
      title: result.title,
      subtitle: result.subtitle,
      url: result.url,
    })
    
    // Navigate
    router.push(result.url)
    onOpenChange(false)
    setQuery('')
  }, [router, onOpenChange])

  const handleClearRecent = useCallback(() => {
    clearRecentSearches()
    setRecentSearches([])
  }, [])

  const showRecent = !query && recentSearches.length > 0
  const showContextual = !query && contextualSuggestions.length > 0
  const showResults = query.length >= 2 && filteredResults.length > 0
  const showEmpty = query.length >= 2 && !isLoading && filteredResults.length === 0

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput 
        placeholder={t('search.placeholder')}
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {showEmpty && (
          <CommandEmpty>
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <Search className="h-10 w-10 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">{t('search.noResults')}</p>
            </div>
          </CommandEmpty>
        )}

        {showRecent && (
          <>
            <CommandGroup heading={t('search.recentSearches')}>
              {recentSearches.map((item) => {
                const Icon = typeIcons[item.type]
                return (
                  <CommandItem
                    key={`recent-${item.id}-${item.type}`}
                    value={`${item.title} ${item.subtitle || ''}`}
                    onSelect={() => handleSelect(item)}
                  >
                    <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                    <Icon className="mr-2 h-4 w-4" />
                    <div className="flex flex-col">
                      <span>{item.title}</span>
                      {item.subtitle && (
                        <span className="text-xs text-muted-foreground">{item.subtitle}</span>
                      )}
                    </div>
                  </CommandItem>
                )
              })}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {showContextual && (
          <>
            <CommandGroup heading={t('search.suggestions')}>
              {contextualSuggestions.map((item) => {
                const Icon = typeIcons[item.type]
                return (
                  <CommandItem
                    key={`contextual-${item.id}`}
                    value={`${item.title} ${item.subtitle || ''}`}
                    onSelect={() => handleSelect(item)}
                  >
                    <Sparkles className="mr-2 h-4 w-4 text-primary" />
                    <Icon className="mr-2 h-4 w-4" />
                    <div className="flex flex-col">
                      <span>{item.title}</span>
                      {item.subtitle && (
                        <span className="text-xs text-muted-foreground">{item.subtitle}</span>
                      )}
                    </div>
                  </CommandItem>
                )
              })}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {showResults && (
          <CommandGroup heading={`${filteredResults.length} ${t('search.resultCount')}`}>
            {filteredResults.map((result) => {
              const Icon = typeIcons[result.type]
              return (
                <CommandItem
                  key={`result-${result.id}-${result.type}`}
                  value={`${result.title} ${result.subtitle || ''} ${result.description || ''}`}
                  onSelect={() => handleSelect(result)}
                >
                  <Icon className="mr-2 h-4 w-4" />
                  <div className="flex flex-col flex-1">
                    <div className="flex items-center justify-between">
                      <span>{result.title}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {t(`search.types.${result.type}`)}
                      </span>
                    </div>
                    {result.subtitle && (
                      <span className="text-xs text-muted-foreground">{result.subtitle}</span>
                    )}
                  </div>
                </CommandItem>
              )
            })}
          </CommandGroup>
        )}

        {isLoading && query.length >= 2 && (
          <div className="py-6 text-center text-sm text-muted-foreground">
            {t('common.loading')}
          </div>
        )}
      </CommandList>

      {showRecent && (
        <div className="border-t p-2">
          <button
            onClick={handleClearRecent}
            className="w-full text-xs text-muted-foreground hover:text-foreground text-center py-1"
          >
            {t('search.clearRecent')}
          </button>
        </div>
      )}

      <div className="border-t p-2 text-xs text-muted-foreground">
        <div className="flex items-center justify-between">
          <span>{t('search.keyboard.navigate')}</span>
          <span>{t('search.keyboard.select')}</span>
          <span>{t('search.keyboard.close')}</span>
        </div>
      </div>
    </CommandDialog>
  )
}
