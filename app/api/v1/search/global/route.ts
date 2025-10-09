import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerActionClient } from '@/utils/supabase/server'

interface SearchResult {
  id: string
  type: 'user' | 'shift' | 'recipe' | 'inventory' | 'financial' | 'location' | 'navigation'
  title: string
  subtitle?: string
  description?: string
  url: string
  score: number
  metadata?: Record<string, any>
}

function calculateScore(text: string, query: string): number {
  const lowerText = text.toLowerCase()
  const lowerQuery = query.toLowerCase()
  
  // Exact match
  if (lowerText === lowerQuery) return 100
  
  // Starts with
  if (lowerText.startsWith(lowerQuery)) return 90
  
  // Contains at beginning of word
  if (lowerText.includes(` ${lowerQuery}`)) return 80
  
  // Contains anywhere
  if (lowerText.includes(lowerQuery)) return 70
  
  // Fuzzy match (simple)
  const words = lowerQuery.split(' ')
  const matchedWords = words.filter(word => lowerText.includes(word))
  if (matchedWords.length > 0) {
    return 60 * (matchedWords.length / words.length)
  }
  
  return 0
}

async function searchUsers(
  supabase: any,
  query: string,
  org_id: string,
  location_id: string | null
): Promise<SearchResult[]> {
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, avatar_url')
    .eq('org_id', org_id)
    .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
    .limit(10)

  if (error || !profiles) return []

  return profiles.map((profile: any) => ({
    id: profile.id,
    type: 'user' as const,
    title: profile.full_name || profile.email,
    subtitle: profile.email,
    url: `/users/${profile.id}`,
    score: calculateScore(profile.full_name || profile.email, query),
    metadata: { avatar_url: profile.avatar_url },
  }))
}

async function searchShifts(
  supabase: any,
  query: string,
  org_id: string,
  location_id: string | null
): Promise<SearchResult[]> {
  if (!location_id) return []

  const { data: shifts, error } = await supabase
    .from('shifts')
    .select('id, title, start_at, end_at, location_id')
    .eq('org_id', org_id)
    .eq('location_id', location_id)
    .ilike('title', `%${query}%`)
    .order('start_at', { ascending: false })
    .limit(10)

  if (error || !shifts) return []

  return shifts.map((shift: any) => ({
    id: shift.id,
    type: 'shift' as const,
    title: shift.title,
    subtitle: new Date(shift.start_at).toLocaleDateString(),
    url: `/shifts/${shift.id}`,
    score: calculateScore(shift.title, query),
  }))
}

async function searchRecipes(
  supabase: any,
  query: string,
  org_id: string,
  location_id: string | null
): Promise<SearchResult[]> {
  if (!location_id) return []

  const { data: recipes, error } = await supabase
    .from('recipes')
    .select('id, name, description, category')
    .eq('org_id', org_id)
    .eq('location_id', location_id)
    .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
    .limit(10)

  if (error || !recipes) return []

  return recipes.map((recipe: any) => ({
    id: recipe.id,
    type: 'recipe' as const,
    title: recipe.name,
    subtitle: recipe.category,
    description: recipe.description?.substring(0, 100),
    url: `/recipes/${recipe.id}`,
    score: calculateScore(recipe.name, query),
  }))
}

async function searchInventory(
  supabase: any,
  query: string,
  org_id: string,
  location_id: string | null
): Promise<SearchResult[]> {
  if (!location_id) return []

  const { data: items, error } = await supabase
    .from('inventory_catalog_items')
    .select('id, name, category, uom')
    .eq('org_id', org_id)
    .eq('location_id', location_id)
    .eq('is_active', true)
    .ilike('name', `%${query}%`)
    .limit(10)

  if (error || !items) return []

  return items.map((item: any) => ({
    id: item.id,
    type: 'inventory' as const,
    title: item.name,
    subtitle: `${item.category} - ${item.uom}`,
    url: `/inventory/items/${item.id}`,
    score: calculateScore(item.name, query),
  }))
}

async function searchFinancial(
  supabase: any,
  query: string,
  org_id: string,
  location_id: string | null
): Promise<SearchResult[]> {
  if (!location_id) return []

  const { data: closures, error } = await supabase
    .from('cash_closures')
    .select('id, closure_date, status, total_amount')
    .eq('org_id', org_id)
    .eq('location_id', location_id)
    .order('closure_date', { ascending: false })
    .limit(10)

  if (error || !closures) return []

  return closures
    .filter((closure: any) => {
      const dateStr = new Date(closure.closure_date).toLocaleDateString()
      return dateStr.includes(query) || closure.status.includes(query)
    })
    .map((closure: any) => ({
      id: closure.id,
      type: 'financial' as const,
      title: `Chiusura ${new Date(closure.closure_date).toLocaleDateString()}`,
      subtitle: `${closure.status} - €${closure.total_amount}`,
      url: `/finance/closures/${closure.id}`,
      score: calculateScore(new Date(closure.closure_date).toLocaleDateString(), query),
    }))
}

async function searchLocations(
  supabase: any,
  query: string,
  org_id: string
): Promise<SearchResult[]> {
  const { data: locations, error } = await supabase
    .from('locations')
    .select('id, name, city, address_line1')
    .eq('org_id', org_id)
    .eq('status', 'active')
    .ilike('name', `%${query}%`)
    .limit(5)

  if (error || !locations) return []

  return locations.map((location: any) => ({
    id: location.id,
    type: 'location' as const,
    title: location.name,
    subtitle: `${location.city || ''} ${location.address_line1 || ''}`.trim(),
    url: `/locations/${location.id}`,
    score: calculateScore(location.name, query),
  }))
}

function searchNavigation(query: string): SearchResult[] {
  const navigationItems = [
    { id: 'dashboard', title: 'Dashboard', url: '/dashboard' },
    { id: 'shifts', title: 'Turni', url: '/shifts' },
    { id: 'users', title: 'Utenti', url: '/users' },
    { id: 'recipes', title: 'Ricette', url: '/recipes' },
    { id: 'inventory', title: 'Inventario', url: '/inventory' },
    { id: 'finance', title: 'Gestione Finanziaria', url: '/finance' },
    { id: 'reports', title: 'Report', url: '/reports' },
    { id: 'settings', title: 'Impostazioni', url: '/settings' },
  ]

  return navigationItems
    .filter(item => item.title.toLowerCase().includes(query.toLowerCase()))
    .map(item => ({
      ...item,
      type: 'navigation' as const,
      score: calculateScore(item.title, query),
    }))
}

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const supabase = await createSupabaseServerActionClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q')?.trim()

    if (!query || query.length < 2) {
      return NextResponse.json({ 
        results: [], 
        total: 0,
        took: Date.now() - startTime 
      })
    }

    // Get user context
    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id, default_location_id')
      .eq('id', user.id)
      .single()

    if (!profile?.org_id) {
      return NextResponse.json({ error: 'No organization' }, { status: 403 })
    }

    // Parallel search across all entities
    const [users, shifts, recipes, inventory, financial, locations, navigation] = await Promise.all([
      searchUsers(supabase, query, profile.org_id, profile.default_location_id),
      searchShifts(supabase, query, profile.org_id, profile.default_location_id),
      searchRecipes(supabase, query, profile.org_id, profile.default_location_id),
      searchInventory(supabase, query, profile.org_id, profile.default_location_id),
      searchFinancial(supabase, query, profile.org_id, profile.default_location_id),
      searchLocations(supabase, query, profile.org_id),
      Promise.resolve(searchNavigation(query)),
    ])

    // Combine and sort by score
    const allResults = [
      ...users,
      ...shifts,
      ...recipes,
      ...inventory,
      ...financial,
      ...locations,
      ...navigation,
    ].sort((a, b) => b.score - a.score)

    return NextResponse.json({
      results: allResults.slice(0, 20), // Limit to top 20 results
      total: allResults.length,
      took: Date.now() - startTime,
    })

  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500 }
    )
  }
}
