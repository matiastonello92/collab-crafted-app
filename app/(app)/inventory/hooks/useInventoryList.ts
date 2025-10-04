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
  profiles?: {
    full_name?: string
  }
}

const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: 'include' })
  if (!res.ok) throw new Error('Failed to fetch inventory list')
  return res.json()
}

export function useInventoryList(
  locationId: string | null,
  category: string
) {
  const url = locationId
    ? `/api/v1/inventory/list?location_id=${locationId}&category=${category}`
    : null

  const { data, error, mutate, isLoading } = useSWR<InventoryHeader[]>(
    url,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnMount: true,
      dedupingInterval: 5000,
    }
  )

  return {
    inventories: data || [],
    isLoading,
    error,
    mutate,
  }
}
