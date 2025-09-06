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

      toast.success(`${newManagerEmail} è stato assegnato come responsabile.`)

      setNewManagerEmail('')
      fetchManagers()
    } catch (error: any) {
      toast.error(error.message || 'Impossibile aggiungere il manager.')
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

      toast.success(`${email} non è più responsabile di questa location.`)

      fetchManagers()
    } catch (error) {
      toast.error('Impossibile rimuovere il manager.')
    }
  }

  return (
    <div className="space-y-6">
      {/* Add Manager Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Aggiungi Responsabile
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="managerEmail">Email del nuovo responsabile</Label>
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
                {addLoading ? 'Aggiungendo...' : 'Aggiungi'}
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
            Responsabili Attuali ({managers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4">Caricamento...</div>
          ) : managers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="mx-auto h-12 w-12 mb-4" />
              <p>Nessun responsabile assegnato a questa location.</p>
              <p className="text-sm">Usa il form sopra per aggiungere il primo responsabile.</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Assegnato il</TableHead>
                    <TableHead className="text-right">Azioni</TableHead>
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
                          Rimuovi
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