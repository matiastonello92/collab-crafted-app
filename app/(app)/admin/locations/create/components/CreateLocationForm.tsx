'use client'

import NextImage from 'next/image'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Upload, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export function CreateLocationForm() {
  const [formData, setFormData] = useState({
    name: '',
    city: '',
    country: 'France',
    phone: '',
    email: '',
    address: '',
    is_active: true,
    photo_url: '',
  })
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const router = useRouter()

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/v1/admin/locations/upload-photo', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Upload failed')
      }

      const data = await response.json()
      setFormData(prev => ({ ...prev, photo_url: data.url }))
      
      toast.success('La foto è stata caricata con successo.')
    } catch (error) {
      toast.error('Impossibile caricare la foto. Riprova.')
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      toast.error('Il nome della location è obbligatorio.')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/v1/admin/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        throw new Error('Failed to create location')
      }

      const data = await response.json()
      
      toast.success('La nuova location è stata creata con successo.')

      router.push(`/admin/locations/${data.location.id}`)
    } catch (error) {
      toast.error('Impossibile creare la location. Riprova.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Nome Location *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="es. Sede Milano Centro"
              required
            />
          </div>

          <div>
            <Label htmlFor="city">Città</Label>
            <Input
              id="city"
              value={formData.city}
              onChange={(e) => setFormData({...formData, city: e.target.value})}
              placeholder="es. Milano"
            />
          </div>

          <div>
            <Label htmlFor="country">Paese</Label>
            <Select
              value={formData.country}
              onValueChange={(value) => setFormData({...formData, country: value})}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="France">France</SelectItem>
                <SelectItem value="Italy">Italy</SelectItem>
                <SelectItem value="Spain">Spain</SelectItem>
                <SelectItem value="Germany">Germany</SelectItem>
              </SelectContent>
            </Select>
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
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
              placeholder="+33 1 23 45 67 89"
            />
          </div>

          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              placeholder="location@company.com"
            />
          </div>

          <div>
            <Label htmlFor="address">Indirizzo</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({...formData, address: e.target.value})}
              placeholder="Indirizzo completo..."
              rows={3}
            />
          </div>
        </div>
      </div>

      {/* Photo Upload */}
      <Card>
        <CardHeader>
          <CardTitle>Foto Location</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Label htmlFor="photo">Carica una foto (opzionale)</Label>
            <div className="flex items-center gap-4">
              <Input
                id="photo"
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                disabled={uploading}
              />
              {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
            </div>
            {formData.photo_url && (
              <div className="mt-4">
                <NextImage
                  src={formData.photo_url}
                  alt="Anteprima foto location"
                  width={128}
                  height={128}
                  className="h-32 w-32 rounded-md object-cover"
                  unoptimized
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
        >
          Annulla
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creazione...
            </>
          ) : (
            'Crea Location'
          )}
        </Button>
      </div>
    </form>
  )
}