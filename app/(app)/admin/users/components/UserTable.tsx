'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Search, Users, Eye, ArrowUpDown, ArrowUp, ArrowDown, Copy } from 'lucide-react'
import type { UserWithDetails } from '@/lib/data/admin'
import { useBreakpoint } from '@/hooks/useBreakpoint'
import { useTranslation } from '@/lib/i18n'
import { toast } from 'sonner'

interface UserTableProps {
  users: UserWithDetails[]
  total: number
  currentPage: number
  hasMore: boolean
}

export default function UserTable({ users, total, currentPage, hasMore }: UserTableProps) {
  const { isMobile } = useBreakpoint()
  const { t } = useTranslation()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('search') || '')
  
  const currentSortBy = searchParams.get('sortBy') || 'created_at'
  const currentSortOrder = searchParams.get('sortOrder') || 'desc'
  const currentStatusFilter = searchParams.get('status') || 'all'

  const updateParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '') {
        params.delete(key)
      } else {
        params.set(key, value)
      }
    })
    router.push(`?${params.toString()}`)
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateParams({ search: search.trim(), page: null })
  }

  const handleSort = (field: string) => {
    const newOrder = currentSortBy === field && currentSortOrder === 'asc' ? 'desc' : 'asc'
    updateParams({ sortBy: field, sortOrder: newOrder, page: null })
  }

  const handleStatusFilter = (status: string) => {
    updateParams({ status: status === 'all' ? null : status, page: null })
  }

  const getFullName = (user: UserWithDetails) => {
    const parts = [user.first_name, user.last_name].filter(Boolean)
    return parts.length > 0 ? parts.join(' ') : t('admin.users.nameNotAvailable')
  }

  const copyInviteLink = (token: string) => {
    const url = `${window.location.origin}/auth/accept-invite?token=${token}`
    navigator.clipboard.writeText(url)
    toast.success('Link copiato negli appunti!')
  }

  const SortableHeader = ({ field, children }: { field: string; children: React.ReactNode }) => (
    <TableHead 
      onClick={() => handleSort(field)}
      className="cursor-pointer hover:bg-muted/50 transition-colors select-none"
    >
      <div className="flex items-center gap-1">
        {children}
        {currentSortBy === field ? (
          currentSortOrder === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-30" />
        )}
      </div>
    </TableHead>
  )

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

        {/* Status Filters */}
        <div className="flex flex-wrap gap-2">
          {[
            { key: 'all', label: 'Tutti' },
            { key: 'active', label: 'Attivi' },
            { key: 'inactive', label: 'Inattivi' },
            { key: 'pending', label: 'Inviti Pending' },
            { key: 'expired', label: 'Inviti Scaduti' },
          ].map(({ key, label }) => (
            <Button
              key={key}
              variant={currentStatusFilter === key ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleStatusFilter(key)}
            >
              {label}
            </Button>
          ))}
        </div>

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
                      <div className="flex flex-col gap-1">
                        <Badge 
                          variant={
                            user.user_type === 'registered' 
                              ? (user.is_active ? 'default' : 'secondary')
                              : 'outline'
                          } 
                          className="shrink-0 w-fit"
                        >
                          {user.user_type === 'registered' 
                            ? (user.is_active ? t('admin.users.active') : t('admin.users.inactive'))
                            : (user.invitation_status === 'expired' ? 'Scaduto' : 'Pending')
                          }
                        </Badge>
                        {user.user_type === 'registered' && user.is_schedulable && (
                          <Badge variant="outline" className="text-xs w-fit">
                            Pianificabile
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-muted-foreground">
                        {user.created_at 
                          ? new Date(user.created_at).toLocaleDateString('it-IT')
                          : 'N/D'
                        }
                      </p>
                      {user.user_type === 'registered' ? (
                        <Button asChild variant="outline" size="sm" className="shrink-0">
                          <Link href={`/admin/users/${user.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            {t('admin.users.viewDetails')}
                          </Link>
                        </Button>
                      ) : (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="shrink-0"
                          onClick={() => copyInviteLink(user.invitation_token!)}
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          Copia Link
                        </Button>
                      )}
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
                <SortableHeader field="email">{t('admin.users.email')}</SortableHeader>
                <SortableHeader field="name">{t('admin.users.name')}</SortableHeader>
                <SortableHeader field="status">{t('admin.users.status')}</SortableHeader>
                <SortableHeader field="created_at">{t('admin.users.registered')}</SortableHeader>
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
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={
                            user.user_type === 'registered' 
                              ? (user.is_active ? 'default' : 'secondary')
                              : 'outline'
                          }
                        >
                          {user.user_type === 'registered' 
                            ? (user.is_active ? t('admin.users.active') : t('admin.users.inactive'))
                            : (user.invitation_status === 'expired' ? 'Scaduto' : 'Pending')
                          }
                        </Badge>
                        {user.user_type === 'registered' && user.is_schedulable && (
                          <Badge variant="outline" className="text-xs">
                            Pianificabile
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {user.created_at 
                        ? new Date(user.created_at).toLocaleDateString('it-IT')
                        : 'N/D'
                      }
                    </TableCell>
                    <TableCell>
                      {user.user_type === 'registered' ? (
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/admin/users/${user.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            {t('admin.users.viewDetails')}
                          </Link>
                        </Button>
                      ) : (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => copyInviteLink(user.invitation_token!)}
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          Copia Link
                        </Button>
                      )}
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