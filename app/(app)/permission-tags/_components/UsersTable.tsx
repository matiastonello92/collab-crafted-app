'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { useTranslation } from '@/lib/i18n'
import {
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { 
  Search, 
  Filter, 
  UserPlus, 
  UserMinus, 
  MoreHorizontal, 
  Users, 
  Building2,
  MapPin 
} from 'lucide-react'
import { 
  assignTagToUser, 
  removeTagFromUser, 
  bulkAssignTagToUsers 
} from '../actions'
import { PERMISSION_TAGS, PermissionTag } from '@/lib/permissions/modules'

interface User {
  id: any
  email: any
  full_name: any
  created_at: any
  user_roles_locations: Array<{
    organization_id: any
    location_id: any
    roles: { id: any; code: any; name: any }[]
    organizations: { name: any }[]
    locations?: { name: any }[]
  }>
}

interface UsersTableProps {
  initialUsers: User[]
  totalCount: number
  currentPage: number
  pageSize: number
  totalPages: number
}

export function UsersTable({ 
  initialUsers, 
  totalCount, 
  currentPage, 
  pageSize, 
  totalPages 
}: UsersTableProps) {
  const { t } = useTranslation();
  const [users] = useState<User[]>(initialUsers)
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [filterOrgId, setFilterOrgId] = useState('')
  const [filterLocationId, setFilterLocationId] = useState('')
  const [isPending, startTransition] = useTransition()

  // Handle individual user selection
  const toggleUserSelection = (userId: string) => {
    const newSelection = new Set(selectedUsers)
    if (newSelection.has(userId)) {
      newSelection.delete(userId)
    } else {
      newSelection.add(userId)
    }
    setSelectedUsers(newSelection)
  }

  // Handle select all
  const toggleAllSelection = () => {
    if (selectedUsers.size === users.length) {
      setSelectedUsers(new Set())
    } else {
      setSelectedUsers(new Set(users.map(u => u.id)))
    }
  }

  // Handle assign tag to single user
  const handleAssignTag = async (user: User, tag: PermissionTag, orgId: string, locationId?: string) => {
    startTransition(async () => {
      const formData = new FormData()
      formData.append('userId', user.id)
      formData.append('orgId', orgId)
      if (locationId) formData.append('locationId', locationId)
      formData.append('tag', tag)

      const result = await assignTagToUser(formData)
      
      if (result.success) {
        toast.success(result.message)
      } else {
        toast.error(result.error)
      }
    })
  }

  // Handle remove tag from single user
  const handleRemoveTag = async (user: User, tag: PermissionTag, orgId: string, locationId?: string) => {
    startTransition(async () => {
      const formData = new FormData()
      formData.append('userId', user.id)
      formData.append('orgId', orgId)
      if (locationId) formData.append('locationId', locationId)
      formData.append('tag', tag)

      const result = await removeTagFromUser(formData)
      
      if (result.success) {
        toast.success(result.message)
      } else {
        toast.error(result.error)
      }
    })
  }

  // Handle bulk assign
  const handleBulkAssign = async (tag: PermissionTag, orgId: string, locationId?: string) => {
    if (selectedUsers.size === 0) {
      toast.warning(t('permissionTags.selectUsersFirst'))
      return
    }

    startTransition(async () => {
      const formData = new FormData()
      formData.append('userIds', JSON.stringify(Array.from(selectedUsers)))
      formData.append('orgId', orgId)
      if (locationId) formData.append('locationId', locationId)
      formData.append('tag', tag)

      const result = await bulkAssignTagToUsers(formData)
      
      if (result.success) {
        toast.success(result.message)
        setSelectedUsers(new Set())
      } else {
        toast.error(result.error)
      }
    })
  }

  // Get user's current tags
  const getUserTags = (user: User) => {
    return user.user_roles_locations.map(url => ({
      tag: url.roles[0]?.code as PermissionTag,
      tagName: PERMISSION_TAGS[url.roles[0]?.code as PermissionTag]?.name || url.roles[0]?.name,
      orgName: url.organizations[0]?.name,
      locationName: url.locations?.[0]?.name || 'All Locations',
      orgId: url.organization_id,
      locationId: url.location_id
    }))
  }

  // Get unique organizations from users for filtering
  const organizations = Array.from(new Set(
    users.flatMap(u => 
      u.user_roles_locations.map(url => ({
        id: url.organization_id,
        name: url.organizations[0]?.name
      }))
    )
  ))

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Users Management
            </CardTitle>
            <CardDescription>
              Assign and manage permission tags for users ({totalCount} total)
            </CardDescription>
          </div>
          
          {selectedUsers.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {selectedUsers.size} selected
              </span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Bulk Assign
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {Object.entries(PERMISSION_TAGS).map(([key, config]) => (
                    <DropdownMenuItem
                      key={key}
                      onClick={() => handleBulkAssign(key as PermissionTag, organizations[0]?.id || '')}
                    >
                      Assign {config.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder={t('permissionTags.filters.search')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={filterOrgId} onValueChange={setFilterOrgId}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder={t('permissionTags.filters.filterOrg')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">{t('permissionTags.filters.allOrgs')}</SelectItem>
              {organizations.map(org => (
                <SelectItem key={org.id} value={org.id}>
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    {org.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Checkbox
                    checked={selectedUsers.size === users.length && users.length > 0}
                    onCheckedChange={toggleAllSelection}
                  />
                </TableHead>
                <TableHead>{t('permissionTags.tableHeaders.user')}</TableHead>
                <TableHead>{t('permissionTags.tableHeaders.organizations')}</TableHead>
                <TableHead>{t('permissionTags.tableHeaders.currentTags')}</TableHead>
                <TableHead>{t('permissionTags.tableHeaders.created')}</TableHead>
                <TableHead className="w-20">{t('permissionTags.tableHeaders.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => {
                const userTags = getUserTags(user)
                return (
                  <TableRow key={user.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedUsers.has(user.id)}
                        onCheckedChange={() => toggleUserSelection(user.id)}
                      />
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex flex-col">
                        <div className="font-medium">
                          {user.full_name || 'No Name'}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {user.email}
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {Array.from(new Set(userTags.map(t => t.orgName))).map(orgName => (
                          <div key={orgName} className="flex items-center gap-2 text-sm">
                            <Building2 className="w-4 h-4 text-muted-foreground" />
                            {orgName}
                          </div>
                        ))}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {userTags.map((tagInfo, idx) => (
                          <div key={idx} className="flex flex-col gap-1">
                            <Badge 
                              variant={tagInfo.tag === 'admin' ? 'destructive' : 
                                      tagInfo.tag === 'manager' ? 'default' : 'secondary'}
                            >
                              {tagInfo.tagName}
                            </Badge>
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {tagInfo.locationName}
                            </div>
                          </div>
                        ))}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {new Date(user.created_at).toLocaleDateString()}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {Object.entries(PERMISSION_TAGS).map(([key, config]) => (
                            <DropdownMenuItem
                              key={`assign-${key}`}
                              onClick={() => handleAssignTag(
                                user, 
                                key as PermissionTag, 
                                userTags[0]?.orgId || organizations[0]?.id || '',
                                userTags[0]?.locationId || undefined
                              )}
                              disabled={isPending}
                            >
                              <UserPlus className="w-4 h-4 mr-2" />
                              Assign {config.name}
                            </DropdownMenuItem>
                          ))}
                          
                          {userTags.length > 0 && (
                            <>
                              <hr className="my-1" />
                              {userTags.map((tagInfo, idx) => (
                                <DropdownMenuItem
                                  key={`remove-${idx}`}
                                  onClick={() => handleRemoveTag(
                                    user,
                                    tagInfo.tag,
                                    tagInfo.orgId,
                                    tagInfo.locationId || undefined
                                  )}
                                  disabled={isPending}
                                  className="text-destructive"
                                >
                                  <UserMinus className="w-4 h-4 mr-2" />
                                  Remove {tagInfo.tagName}
                                </DropdownMenuItem>
                              ))}
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-2 py-4">
            <div className="text-sm text-muted-foreground">
              Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} users
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
              >
                Previous
              </Button>
              <div className="text-sm">
                Page {currentPage} of {totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}