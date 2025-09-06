import { Suspense } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import Link from 'next/link'
import AdminGate from './components/AdminGate'
import UserTable from './components/UserTable'
import { getUsersWithDetails } from '@/lib/data/admin'
import { requireAdmin } from '@/lib/admin/guards'
import { TableSkeleton } from '@/components/ui/loading-skeleton'

export const runtime = 'nodejs';

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
  await requireAdmin()
  
  const currentPage = parseInt(searchParams.page || '1')
  const search = searchParams.search || ''
  
  const { users, total, hasMore } = await getUsersWithDetails(currentPage, 20, search)

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestione Utenti</h1>
          <p className="text-muted-foreground">
            Amministrazione utenti del sistema
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/users/invite">
            <Plus className="mr-2 h-4 w-4" />
            Invita Utente
          </Link>
        </Button>
      </div>

      <Suspense fallback={<TableSkeleton />}>
        <UserTable 
          users={users}
          total={total}
          currentPage={currentPage}
          hasMore={hasMore}
        />
      </Suspense>
    </div>
  )
}
