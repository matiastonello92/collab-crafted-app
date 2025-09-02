import { Suspense } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import AdminGate from './components/AdminGate'
import UserTable from './components/UserTable'
import { getUsersWithDetails } from '@/lib/data/admin'

interface SearchParams {
  page?: string
  search?: string
}

export default async function AdminUsersPage({ 
  searchParams 
}: { 
  searchParams: SearchParams 
}) {
  const currentPage = parseInt(searchParams.page || '1')
  const search = searchParams.search || ''
  
  const { users, total, hasMore } = await getUsersWithDetails(currentPage, 20, search)

  return (
    <AdminGate>
      <div className="container mx-auto py-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Gestione Utenti</h1>
            <p className="text-muted-foreground">
              Amministrazione utenti del sistema
            </p>
          </div>
          <Button disabled>
            <Plus className="mr-2 h-4 w-4" />
            Invita Utente
          </Button>
        </div>

        <Suspense fallback={<div>Caricamento...</div>}>
          <UserTable 
            users={users}
            total={total}
            currentPage={currentPage}
            hasMore={hasMore}
          />
        </Suspense>
      </div>
    </AdminGate>
  )
}
