'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Search, Users, Eye } from 'lucide-react'
import type { UserWithDetails } from '@/lib/data/admin'
import { useBreakpoint } from '@/hooks/useBreakpoint'
import { useTranslation } from '@/lib/i18n'

interface UserTableProps {
  users: UserWithDetails[]
  total: number
  currentPage: number
  hasMore: boolean
}

export default function UserTable({ users, total, currentPage, hasMore }: UserTableProps) {
  const { isMobile } = useBreakpoint()
  const { t } = useTranslation()
  const [search, setSearch] = useState('')

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams(window.location.search)
    if (search.trim()) {
      params.set('search', search)
    } else {
      params.delete('search')
    }
    params.delete('page') // Reset to first page on new search
    window.location.search = params.toString()
  }

  const getFullName = (user: UserWithDetails) => {
    const parts = [user.first_name, user.last_name].filter(Boolean)
    return parts.length > 0 ? parts.join(' ') : t('admin.users.nameNotAvailable')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          {t('admin.users.title')}
        </CardTitle>
        <CardDescription>
          {t('admin.users.totalUsers').replace('{count}', total.toString())}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('admin.users.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button type="submit">{t('admin.users.search')}</Button>
        </form>

        {/* Mobile: Card Layout */}
        {isMobile ? (
          <div className="space-y-3">
            {users.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">
                {t('admin.users.noUsers')}
              </p>
            ) : (
              users.map((user) => (
                <Card key={user.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">
                          {user.email || t('admin.users.emailNotAvailable')}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {getFullName(user)}
                        </p>
                      </div>
                      <Badge variant={user.is_active ? 'default' : 'secondary'} className="shrink-0">
                        {user.is_active ? t('admin.users.active') : t('admin.users.inactive')}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-muted-foreground">
                        {user.created_at 
                          ? new Date(user.created_at).toLocaleDateString('it-IT')
                          : 'N/D'
                        }
                      </p>
                      <Button asChild variant="outline" size="sm" className="shrink-0">
                        <Link href={`/admin/users/${user.id}`}>
                          <Eye className="mr-2 h-4 w-4" />
                          {t('admin.users.viewDetails')}
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        ) : (
          /* Desktop: Table */
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('admin.users.id')}</TableHead>
                <TableHead>{t('admin.users.email')}</TableHead>
                <TableHead>{t('admin.users.name')}</TableHead>
                <TableHead>{t('admin.users.status')}</TableHead>
                <TableHead>{t('admin.users.registered')}</TableHead>
                <TableHead>{t('admin.users.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {t('admin.users.noUsers')}
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-mono text-sm">
                      {user.id.slice(0, 8)}...
                    </TableCell>
                    <TableCell className="font-medium">
                      {user.email || t('admin.users.emailNotAvailable')}
                    </TableCell>
                    <TableCell>
                      {getFullName(user)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.is_active ? 'default' : 'secondary'}>
                        {user.is_active ? t('admin.users.active') : t('admin.users.inactive')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {user.created_at 
                        ? new Date(user.created_at).toLocaleDateString('it-IT')
                        : 'N/D'
                      }
                    </TableCell>
                    <TableCell>
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/admin/users/${user.id}`}>
                          <Eye className="mr-2 h-4 w-4" />
                          {t('admin.users.viewDetails')}
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}

        {/* Pagination */}
        {total > 0 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {t('admin.users.page')
                .replace('{page}', currentPage.toString())
                .replace('{shown}', users.length.toString())
                .replace('{total}', total.toString())}
            </p>
            <div className="flex gap-2">
              {currentPage > 1 && (
                <Button asChild variant="outline" size="sm">
                  <Link href={`?page=${currentPage - 1}`}>
                    {t('admin.users.previous')}
                  </Link>
                </Button>
              )}
              {hasMore && (
                <Button asChild variant="outline" size="sm">
                  <Link href={`?page=${currentPage + 1}`}>
                    {t('admin.users.next')}
                  </Link>
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}