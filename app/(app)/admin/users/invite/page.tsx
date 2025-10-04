import { Suspense } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { requireOrgAdmin } from '@/lib/admin/guards'
import { InviteUserForm } from './components/InviteUserForm'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { t } from '@/lib/i18n'

export default async function InviteUserPage() {
  await requireOrgAdmin()

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/users">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('admin.backToList')}
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{t('admin.inviteUserTitle')}</h1>
          <p className="text-muted-foreground">
            {t('admin.inviteUserDesc')}
          </p>
        </div>
      </div>

      <div className="max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>{t('admin.inviteDetails')}</CardTitle>
            <CardDescription>
              {t('admin.inviteDetailsDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<Skeleton className="h-96 w-full" />}>
              <InviteUserForm />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}