'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from '@/components/ui/command'
import { useTranslation } from '@/lib/i18n'
import { useHydratedContext } from '@/lib/store/useHydratedStore'
import { usePermissions } from '@/hooks/usePermissions'
import { checkPermission } from '@/lib/permissions/unified'
import { useSearchCache, SearchResult } from '@/hooks/useSearchCache'
import { getRecentSearches, addRecentSearch, clearRecentSearches, removeRecentSearch, RecentSearchItem } from '@/lib/search/recentAccess'
import { useSearchAnalytics } from '@/hooks/useSearchAnalytics'
import { SearchPreviewPanel } from './SearchPreviewPanel'
import { Users, Calendar, BookOpen, Package, DollarSign, MapPin, Navigation, Clock, Sparkles, Search, X, TrendingUp, Flame } from 'lucide-react'
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

// Command mode parsing
function parseCommand(input: string): { isCommand: boolean; command?: string; args?: string } {
  if (input.startsWith('>')) {
    const parts = input.slice(1).trim().split(' ')
    return { isCommand: true, command: parts[0], args: parts.slice(1).join(' ') }
  }
  return { isCommand: false }
}

// Quick filter parsing (user:, shift:, @location:, etc.)
function parseFilters(input: string): { query: string; filters: Record<string, string> } {
  const filters: Record<string, string> = {}
  let query = input

  // Extract filters like "user:mario" or "@location:roma"
  const filterRegex = /(@?\w+):(\w+)/g
  let match
  while ((match = filterRegex.exec(input)) !== null) {
    const key = match[1].replace('@', '')
    filters[key] = match[2]
    query = query.replace(match[0], '').trim()
  }

  return { query, filters }
}

export function GlobalSearchCommand({ open, onOpenChange }: GlobalSearchCommandProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const { org_id, location_id, user_id } = useHydratedContext()
  const { permissions } = usePermissions(location_id || undefined)
  const { trackSearch } = useSearchAnalytics()
  
  const [query, setQuery] = useState('')
  const [recentSearches, setRecentSearches] = useState<RecentSearchItem[]>([])
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  
  const debouncedQuery = useDebounce(query, 300)
  
  // Parse command mode and filters
  const { isCommand, command, args } = parseCommand(query)
  const { query: cleanQuery, filters } = parseFilters(debouncedQuery)
  
  const { results, isLoading, total } = useSearchCache(
    cleanQuery, 
    open && cleanQuery.length >= 2 && !isCommand
  )

  // Load recent searches on mount
  useEffect(() => {
    if (open) {
      setRecentSearches(getRecentSearches())
      setSelectedResult(null)
      setShowPreview(false)
    }
  }, [open])

  // Keyboard shortcuts for preview
  useEffect(() => {
    if (!open) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' && selectedResult) {
        setShowPreview(true)
      } else if (e.key === 'ArrowLeft') {
        setShowPreview(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, selectedResult])

  // Filter results based on permissions and filters
  const filteredResults = useMemo(() => {
    let filtered = results.filter(result => {
      // Permission check
      const hasPermission = (() => {
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
            return true
          default:
            return false
        }
      })()

      if (!hasPermission) return false

      // Apply quick filters
      if (filters.user && result.type !== 'user') return false
      if (filters.shift && result.type !== 'shift') return false
      if (filters.recipe && result.type !== 'recipe') return false
      if (filters.inventory && result.type !== 'inventory') return false
      if (filters.location && !result.title.toLowerCase().includes(filters.location.toLowerCase())) return false

      return true
    })

    return filtered
  }, [results, permissions, filters])

  // Enhanced contextual suggestions
  const contextualSuggestions = useMemo(() => {
    if (!org_id || !location_id) return []
    
    const hour = new Date().getHours()
    const day = new Date().getDay()
    const date = new Date().getDate()
    const suggestions: SearchResult[] = []

    // Morning (6-12)
    if (hour >= 6 && hour < 12 && checkPermission(permissions, 'shifts:manage')) {
      suggestions.push({
        id: 'morning-shifts',
        type: 'navigation',
        title: t('search.contextual.morning'),
        subtitle: t('search.actions.createShift'),
        url: '/shifts/create',
        score: 100,
      })
    }

    // Afternoon (14-18)
    if (hour >= 14 && hour < 18 && checkPermission(permissions, 'inventory:manage')) {
      suggestions.push({
        id: 'afternoon-grocery',
        type: 'navigation',
        title: t('search.contextual.afternoon'),
        subtitle: t('search.actions.prepareGroceryList'),
        url: '/inventory',
        score: 95,
      })
    }

    // Evening (18-23)
    if (hour >= 18 && hour < 23 && checkPermission(permissions, 'finance:create')) {
      suggestions.push({
        id: 'evening-cash',
        type: 'navigation',
        title: t('search.contextual.evening'),
        subtitle: t('search.actions.closeCash'),
        url: '/finance/closures/create',
        score: 90,
      })
    }

    // Monday morning
    if (day === 1 && hour >= 6 && hour < 12 && checkPermission(permissions, 'shifts:manage')) {
      suggestions.push({
        id: 'monday-review',
        type: 'navigation',
        title: t('search.contextual.monday'),
        subtitle: t('search.actions.reviewWeek'),
        url: '/shifts/planner',
        score: 85,
      })
    }

    // Friday
    if (day === 5 && checkPermission(permissions, 'finance:view')) {
      suggestions.push({
        id: 'friday-reports',
        type: 'navigation',
        title: t('search.contextual.friday'),
        subtitle: t('search.actions.viewReports'),
        url: '/reports',
        score: 80,
      })
    }

    // Weekend (Sat/Sun)
    if ((day === 0 || day === 6) && checkPermission(permissions, 'shifts:manage')) {
      suggestions.push({
        id: 'weekend-planning',
        type: 'navigation',
        title: t('search.contextual.weekend'),
        subtitle: t('search.actions.planWeekend'),
        url: '/shifts/planner',
        score: 75,
      })
    }

    // Month-end (28-31)
    if (date >= 28 && checkPermission(permissions, 'finance:view')) {
      suggestions.push({
        id: 'monthend-report',
        type: 'navigation',
        title: t('search.contextual.monthEnd'),
        subtitle: t('search.actions.monthlyReport'),
        url: '/reports/monthly',
        score: 70,
      })
    }

    return suggestions
  }, [org_id, location_id, permissions, t])

  // Handle command execution
  const executeCommand = useCallback((cmd: string, cmdArgs: string) => {
    const commandRoutes: Record<string, string> = {
      'create shift': '/shifts/create',
      'new shift': '/shifts/create',
      'create recipe': '/recipes/create',
      'new recipe': '/recipes/create',
      'close cash': '/finance/closures/create',
      'report today': '/reports/daily',
    }

    const route = commandRoutes[cmd.toLowerCase()]
    if (route) {
      router.push(route)
      onOpenChange(false)
      setQuery('')
    }
  }, [router, onOpenChange])

  const handleSelect = useCallback(async (result: SearchResult | RecentSearchItem) => {
    // Track analytics
    if (org_id && user_id) {
      await trackSearch({
        query: cleanQuery || query,
        orgId: org_id,
        locationId: location_id,
        resultsCount: total || 0,
        selectedResultId: result.id,
        selectedResultType: result.type,
        commandMode: isCommand,
        filtersApplied: filters,
      })
    }

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
  }, [router, onOpenChange, cleanQuery, query, org_id, user_id, location_id, total, isCommand, filters, trackSearch])

  const handleClearRecent = useCallback(() => {
    clearRecentSearches()
    setRecentSearches([])
  }, [])

  const handleRemoveRecent = useCallback((id: string, type: string) => {
    removeRecentSearch(id, type)
    setRecentSearches(getRecentSearches())
  }, [])

  // Handle command mode Enter
  useEffect(() => {
    if (isCommand && command) {
      const handleEnter = (e: KeyboardEvent) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          executeCommand(command, args || '')
        }
      }
      window.addEventListener('keydown', handleEnter)
      return () => window.removeEventListener('keydown', handleEnter)
    }
  }, [isCommand, command, args, executeCommand])

  const showRecent = !query && recentSearches.length > 0
  const showContextual = !query && contextualSuggestions.length > 0
  const showResults = cleanQuery.length >= 2 && filteredResults.length > 0 && !isCommand
  const showEmpty = cleanQuery.length >= 2 && !isLoading && filteredResults.length === 0 && !isCommand
  const showCommandMode = isCommand

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <div className={showPreview ? 'grid grid-cols-[1fr,400px]' : ''}>
        <div>
          <CommandInput 
            placeholder={t('search.placeholder')}
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {showCommandMode && (
              <div className="p-4 text-sm">
                <p className="font-medium mb-2">{t('search.commands.help')}</p>
                <ul className="space-y-1 text-muted-foreground">
                  <li>&gt;create shift - {t('search.commands.createShift')}</li>
                  <li>&gt;create recipe - {t('search.commands.createRecipe')}</li>
                  <li>&gt;close cash - {t('search.commands.closeCash')}</li>
                  <li>&gt;report today - {t('search.commands.reportToday')}</li>
                </ul>
              </div>
            )}

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
                        onMouseEnter={() => setSelectedResult(item as SearchResult)}
                      >
                        <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                        <Icon className="mr-2 h-4 w-4" />
                        <div className="flex flex-col flex-1">
                          <span>{item.title}</span>
                          {item.subtitle && (
                            <span className="text-xs text-muted-foreground">{item.subtitle}</span>
                          )}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRemoveRecent(item.id, item.type)
                          }}
                          className="ml-2 p-1 hover:bg-muted rounded"
                        >
                          <X className="h-3 w-3 text-muted-foreground" />
                        </button>
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
                        onMouseEnter={() => setSelectedResult(item)}
                      >
                        <Sparkles className="mr-2 h-4 w-4 text-primary" />
                        <Icon className="mr-2 h-4 w-4" />
                        <div className="flex flex-col flex-1">
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
                  // Simple popularity indicator (score-based)
                  const isPopular = result.score && result.score >= 90
                  
                  return (
                    <CommandItem
                      key={`result-${result.id}-${result.type}`}
                      value={`${result.title} ${result.subtitle || ''} ${result.description || ''}`}
                      onSelect={() => handleSelect(result)}
                      onMouseEnter={() => setSelectedResult(result)}
                    >
                      <Icon className="mr-2 h-4 w-4" />
                      <div className="flex flex-col flex-1">
                        <div className="flex items-center gap-2">
                          <span>{result.title}</span>
                          {isPopular && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/30 text-[10px] font-medium text-orange-700 dark:text-orange-300">
                              <Flame className="h-2.5 w-2.5" />
                              {t('search.badges.popular')}
                            </span>
                          )}
                        </div>
                        {result.subtitle && (
                          <span className="text-xs text-muted-foreground">{result.subtitle}</span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground ml-2">
                        {t(`search.types.${result.type}`)}
                      </span>
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            )}

            {isLoading && cleanQuery.length >= 2 && (
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
            <div className="flex items-center justify-between flex-wrap gap-1">
              <span>{t('search.keyboard.navigate')}</span>
              <span>{t('search.keyboard.select')}</span>
              {selectedResult && <span>{t('search.keyboard.preview')}</span>}
              <span>{t('search.keyboard.close')}</span>
            </div>
          </div>
        </div>

        {showPreview && (
          <SearchPreviewPanel result={selectedResult} />
        )}
      </div>
    </CommandDialog>
  )
}
