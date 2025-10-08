import { getUsersWithDetails } from '@/lib/data/admin'
import { requireOrgAdmin } from '@/lib/admin/guards'
import AdminUsersClient from './AdminUsersClient'

interface SearchParams {
  page?: string
  search?: string
  sortBy?: 'name' | 'email' | 'status' | 'created_at'
  sortOrder?: 'asc' | 'desc'
  status?: 'all' | 'active' | 'inactive' | 'pending' | 'expired'
}

export default async function AdminUsersPage({ 
  searchParams 
}: { 
  searchParams: Promise<SearchParams> 
}) {
  // Guard: require admin permissions
  await requireOrgAdmin()
  
  const params = await searchParams
  
  const currentPage = parseInt(params.page || '1')
  const search = params.search || ''
  const sortBy = params.sortBy || 'created_at'
  const sortOrder = params.sortOrder || 'desc'
  const statusFilter = params.status || 'all'
  
  const { users, total, hasMore } = await getUsersWithDetails(
    currentPage, 
    20, 
    search,
    sortBy,
    sortOrder,
    statusFilter
  )

  return (
    <AdminUsersClient 
      users={users}
      total={total}
      currentPage={currentPage}
      hasMore={hasMore}
    />
  )
}
