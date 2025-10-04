import { getUsersWithDetails } from '@/lib/data/admin'
import { requireOrgAdmin } from '@/lib/admin/guards'
import AdminUsersClient from './AdminUsersClient'

interface SearchParams {
  page?: string
  search?: string
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
  
  const { users, total, hasMore } = await getUsersWithDetails(currentPage, 20, search)

  return (
    <AdminUsersClient 
      users={users}
      total={total}
      currentPage={currentPage}
      hasMore={hasMore}
    />
  )
}
