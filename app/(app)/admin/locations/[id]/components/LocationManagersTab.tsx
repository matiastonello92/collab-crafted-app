'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Plus, Trash2, Users, Mail } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from '@/lib/i18n'

interface Manager {
  user_id: string
  email: string
  created_at: string
}

interface Props {
  locationId: string
}

export function LocationManagersTab({ locationId }: Props) {
  const [managers, setManagers] = useState<Manager[]>([])
  const [newManagerEmail, setNewManagerEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [addLoading, setAddLoading] = useState(false)
  const { t } = useTranslation()

  const fetchManagers = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/v1/admin/locations/${locationId}/managers`)
      if (response.ok) {
        const data = await response.json()
        setManagers(data.managers || [])
      }
    } catch (error) {
      console.error('Error fetching managers:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchManagers()
  }, [locationId])

  const handleAddManager = async () => {
    if (!newManagerEmail.trim()) return

    setAddLoading(true)
    try {
      const response = await fetch(`/api/v1/admin/locations/${locationId}/managers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newManagerEmail.trim() }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to add manager')
      }

      toast.success(t('toast.location.managerAdded'))

      setNewManagerEmail('')
      fetchManagers()
    } catch (error: any) {
      toast.error(error.message || t('toast.location.errorAddingManager'))
    } finally {
      setAddLoading(false)
    }
  }

  const handleRemoveManager = async (email: string) => {
    try {
      const response = await fetch(`/api/v1/admin/locations/${locationId}/managers`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      if (!response.ok) {
        throw new Error('Failed to remove manager')
      }

      toast.success(t('toast.location.managerRemoved'))

      fetchManagers()
    } catch (error) {
      toast.error(t('toast.location.errorRemovingManager'))
    }
  }

  return (
    <div className="space-y-6">
      {/* Add Manager Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            {t('admin.locationManagersAdd')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="managerEmail">{t('admin.locationManagerEmail')}</Label>
              <Input
                id="managerEmail"
                type="email"
                placeholder="manager@example.com"
                value={newManagerEmail}
                onChange={(e) => setNewManagerEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddManager()}
              />
            </div>
            <div className="flex items-end">
              <Button 
                onClick={handleAddManager} 
                disabled={!newManagerEmail.trim() || addLoading}
              >
                {addLoading ? t('admin.adding') : t('admin.add')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Managers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {t('admin.locationManagers')} ({managers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4">{t('admin.loading')}</div>
          ) : managers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="mx-auto h-12 w-12 mb-4" />
              <p>{t('admin.noManagers')}</p>
              <p className="text-sm">{t('admin.noManagersDesc')}</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('admin.locationEmail')}</TableHead>
                    <TableHead>{t('admin.locationManagerAssigned')}</TableHead>
                    <TableHead className="text-right">{t('admin.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {managers.map((manager) => (
                    <TableRow key={manager.user_id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          {manager.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(manager.created_at).toLocaleDateString('it-IT')}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveManager(manager.email)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {t('admin.remove')}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}