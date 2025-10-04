'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import Link from 'next/link'
import UserTable from './components/UserTable'
import { useTranslation } from '@/lib/i18n'

interface AdminUsersClientProps {
  users: any[]
  total: number
  currentPage: number
  hasMore: boolean
}

export default function AdminUsersClient({ users, total, currentPage, hasMore }: AdminUsersClientProps) {
  const { t } = useTranslation()

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('admin.userManagement')}</h1>
          <p className="text-muted-foreground">
            {t('admin.userManagementDesc')}
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/users/invite">
            <Plus className="mr-2 h-4 w-4" />
            {t('admin.inviteUser')}
          </Link>
        </Button>
      </div>

      <UserTable 
        users={users}
        total={total}
        currentPage={currentPage}
        hasMore={hasMore}
      />
    </div>
  )
}
