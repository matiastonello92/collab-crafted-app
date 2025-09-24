'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Edit2, Save, X } from 'lucide-react'
import { toast } from 'sonner'
import type { Tables } from '@/src/integrations/supabase/types'

type Location = Tables<'locations'>

interface Props {
  location: Location
}

export function LocationInfoTab({ location }: Props) {
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState(location)
  const [loading, setLoading] = useState(false)

  const isActive = location.is_active ?? false
  const city = location.city ?? 'Non specificato'
  const country = location.country ?? 'Non specificato'
  const phone = location.phone ?? 'Non specificato'
  const email = location.email ?? 'Non specificato'
  const address = location.address ?? 'Non specificato'

  const handleSave = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/v1/admin/locations/${location.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        throw new Error('Failed to update location')
      }

      toast.success('Le informazioni sono state salvate con successo.')
      
      setIsEditing(false)
      // Refresh page to see changes
      window.location.reload()
    } catch (error) {
      toast.error('Impossibile salvare le modifiche. Riprova.')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setFormData(location)
    setIsEditing(false)
  }

  if (!isEditing) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Informazioni Generali</CardTitle>
          <Button variant="outline" onClick={() => setIsEditing(true)}>
            <Edit2 className="mr-2 h-4 w-4" />
            Modifica
          </Button>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Nome</Label>
              <p className="text-sm text-muted-foreground">{location.name}</p>
            </div>
            
            <div>
              <Label className="text-sm font-medium">Città</Label>
              <p className="text-sm text-muted-foreground">{city}</p>
            </div>

            <div>
              <Label className="text-sm font-medium">Paese</Label>
              <p className="text-sm text-muted-foreground">{country}</p>
            </div>

            <div>
              <Label className="text-sm font-medium">Status</Label>
              <div>
                <Badge variant={isActive ? "default" : "secondary"}>
                  {isActive ? "Attivo" : "Archiviato"}
                </Badge>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Telefono</Label>
              <p className="text-sm text-muted-foreground">{phone}</p>
            </div>

            <div>
              <Label className="text-sm font-medium">Email</Label>
              <p className="text-sm text-muted-foreground">{email}</p>
            </div>

            <div>
              <Label className="text-sm font-medium">Indirizzo</Label>
              <p className="text-sm text-muted-foreground">{address}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Modifica Informazioni</CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleCancel}>
            <X className="mr-2 h-4 w-4" />
            Annulla
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            <Save className="mr-2 h-4 w-4" />
            {loading ? 'Salvataggio...' : 'Salva'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              required
            />
          </div>

          <div>
            <Label htmlFor="city">Città</Label>
            <Input
              id="city"
              value={formData.city || ''}
              onChange={(e) => setFormData({...formData, city: e.target.value})}
            />
          </div>

          <div>
            <Label htmlFor="country">Paese</Label>
            <Input
              id="country"
              value={formData.country || ''}
              onChange={(e) => setFormData({...formData, country: e.target.value})}
            />
          </div>

          <div>
            <Label htmlFor="is_active">Status</Label>
            <Select
              value={formData.is_active ? "true" : "false"}
              onValueChange={(value) => setFormData({...formData, is_active: value === "true"})}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Attivo</SelectItem>
                <SelectItem value="false">Archiviato</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="phone">Telefono</Label>
            <Input
              id="phone"
              value={formData.phone || ''}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
            />
          </div>

          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email || ''}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
            />
          </div>

          <div>
            <Label htmlFor="address">Indirizzo</Label>
            <Textarea
              id="address"
              value={formData.address || ''}
              onChange={(e) => setFormData({...formData, address: e.target.value})}
              rows={3}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}