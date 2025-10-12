'use client'

import { Suspense } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { InviteUserForm } from './components/InviteUserForm'
import { InvitationsList } from './components/InvitationsList'
import { Skeleton } from '@/components/ui/skeleton'
import { useTranslation } from '@/lib/i18n'

export function AdminInvitationsClient() {
  const { t } = useTranslation()

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/users">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('admin.invitationsPage.usersLink')}
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{t('admin.invitationsPage.title')}</h1>
          <p className="text-muted-foreground">
            {t('admin.invitationsPage.description')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Create Invitation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              {t('admin.invitationsPage.createTitle')}
            </CardTitle>
            <CardDescription>
              {t('admin.invitationsPage.createDescription')}
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
            <CardTitle>{t('admin.invitationsPage.listTitle')}</CardTitle>
            <CardDescription>
              {t('admin.invitationsPage.listDescription')}
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
