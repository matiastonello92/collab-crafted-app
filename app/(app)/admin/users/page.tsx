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
  searchParams: SearchParams 
}) {
  // Guard: require admin permissions
  await requireOrgAdmin()
  
  const currentPage = parseInt(searchParams.page || '1')
  const search = searchParams.search || ''
  const sortBy = searchParams.sortBy || 'created_at'
  const sortOrder = searchParams.sortOrder || 'desc'
  const statusFilter = searchParams.status || 'all'
  
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
