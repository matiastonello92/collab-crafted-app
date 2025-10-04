import { redirect } from 'next/navigation'
import { requireOrgAdmin } from '@/lib/admin/guards'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { CreateLocationForm } from './components/CreateLocationForm'
import { t } from '@/lib/i18n'

export default async function CreateLocationPage() {
  await requireOrgAdmin()

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/locations">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('admin.backToList')}
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('admin.createLocation')}</h1>
          <p className="text-muted-foreground">
            {t('admin.createLocationDesc')}
          </p>
        </div>
      </div>

      {/* Create Form */}
      <Card>
        <CardHeader>
          <CardTitle>{t('admin.locationInfo')}</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateLocationForm />
        </CardContent>
      </Card>
    </div>
  )
}