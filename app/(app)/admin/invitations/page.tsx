import { Suspense } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { requireAdmin } from '@/lib/admin/guards'
import { InviteUserForm } from './components/InviteUserForm'
import { InvitationsList } from './components/InvitationsList'
import { Skeleton } from '@/components/ui/skeleton'

export default async function AdminInvitationsPage() {
  await requireAdmin()

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/users">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Utenti
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">Gestione Inviti</h1>
          <p className="text-muted-foreground">
            Crea e gestisci inviti multi-location con permessi personalizzati
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Create Invitation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Crea Nuovo Invito
            </CardTitle>
            <CardDescription>
              Invita un utente con ruoli e permessi specifici per location
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<Skeleton className="h-96 w-full" />}>
              <InviteUserForm />
            </Suspense>
          </CardContent>
        </Card>

        {/* Invitations List */}
        <Card>
          <CardHeader>
            <CardTitle>Inviti Attivi</CardTitle>
            <CardDescription>
              Lista degli inviti inviati e loro stato
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<Skeleton className="h-96 w-full" />}>
              <InvitationsList />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}