import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/admin/guards'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { CreateLocationForm } from './components/CreateLocationForm'

export default async function CreateLocationPage() {
  await requireAdmin()

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/locations">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Torna alla Lista
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Crea Nuova Location</h1>
          <p className="text-muted-foreground">
            Aggiungi una nuova sede aziendale al sistema
          </p>
        </div>
      </div>

      {/* Create Form */}
      <Card>
        <CardHeader>
          <CardTitle>Informazioni Location</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateLocationForm />
        </CardContent>
      </Card>
    </div>
  )
}