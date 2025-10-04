import useSWR from 'swr'

interface InventoryHeader {
  id: string
  category: string
  status: 'in_progress' | 'completed' | 'approved'
  started_by: string
  approved_by?: string
  started_at: string
  approved_at?: string
  total_value: number
  notes?: string
  template_id?: string
  creation_mode?: 'template' | 'last' | 'empty'
}

interface InventoryData {
  header: InventoryHeader | null
  hasTemplates: boolean
}

const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: 'include' })
  if (!res.ok) throw new Error('Failed to fetch inventory data')
  const data = await res.json()
  
  // If it's an array (from headers endpoint), take first item
  if (Array.isArray(data)) {
    return { header: data.length > 0 ? data[0] : null, hasTemplates: false }
  }
  
  return data
}

const templateFetcher = async (url: string) => {
  const res = await fetch(url, { credentials: 'include' })
  if (!res.ok) return []
  return res.json()
}

export function useInventoryData(
  locationId: string | null,
  category: string,
  inventoryId?: string
) {
  // Build URL for header fetch
  const headerUrl = locationId
    ? inventoryId
      ? `/api/v1/inventory/headers?location_id=${locationId}&category=${category}&id=${inventoryId}`
      : `/api/v1/inventory/headers?location_id=${locationId}&category=${category}&status=in_progress`
    : null

  // Build URL for templates check (only when not loading specific inventory)
  const templatesUrl = locationId && !inventoryId
    ? `/api/v1/inventory/templates?location_id=${locationId}&category=${category}&is_active=true`
    : null

  // Fetch header data
  const { data: headerData, error: headerError, mutate: mutateHeader, isLoading: isLoadingHeader } = useSWR<InventoryData>(
    headerUrl,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnMount: true,
      dedupingInterval: 5000,
    }
  )

  // Fetch templates data
  const { data: templatesData, isLoading: isLoadingTemplates } = useSWR<any[]>(
    templatesUrl,
    templateFetcher,
    {
      revalidateOnFocus: false,
      revalidateOnMount: true,
      dedupingInterval: 10000,
    }
  )

  return {
    header: headerData?.header || null,
    hasTemplates: (templatesData && templatesData.length > 0) || false,
    isLoading: isLoadingHeader || isLoadingTemplates,
    error: headerError,
    mutate: mutateHeader,
  }
}
