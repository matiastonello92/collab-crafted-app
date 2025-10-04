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
import { useTranslation } from '@/lib/i18n'

interface Location {
  id: string
  name: string
  city: string
  country: string
  is_active: boolean
  phone?: string
  email?: string
  address?: string
  [key: string]: any
}

interface Props {
  location: Location
}

export function LocationInfoTab({ location }: Props) {
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState(location)
  const [loading, setLoading] = useState(false)
  const { t } = useTranslation()

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

      toast.success(t('toast.location.updated'))
      
      setIsEditing(false)
      // Refresh page to see changes
      window.location.reload()
    } catch (error) {
      toast.error(t('toast.location.errorUpdating'))
    } finally{
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
          <CardTitle>{t('admin.locationInfoGeneral')}</CardTitle>
          <Button variant="outline" onClick={() => setIsEditing(true)}>
            <Edit2 className="mr-2 h-4 w-4" />
            {t('admin.edit')}
          </Button>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">{t('admin.locationName')}</Label>
              <p className="text-sm text-muted-foreground">{location.name}</p>
            </div>
            
            <div>
              <Label className="text-sm font-medium">{t('admin.locationCity')}</Label>
              <p className="text-sm text-muted-foreground">{location.city}</p>
            </div>

            <div>
              <Label className="text-sm font-medium">{t('admin.locationCountry')}</Label>
              <p className="text-sm text-muted-foreground">{location.country}</p>
            </div>

            <div>
              <Label className="text-sm font-medium">{t('admin.status')}</Label>
              <div>
                <Badge variant={location.is_active ? "default" : "secondary"}>
                  {location.is_active ? t('admin.active') : t('admin.archived')}
                </Badge>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">{t('admin.locationPhone')}</Label>
              <p className="text-sm text-muted-foreground">
                {location.phone || t('admin.notSpecified')}
              </p>
            </div>

            <div>
              <Label className="text-sm font-medium">{t('admin.locationEmail')}</Label>
              <p className="text-sm text-muted-foreground">
                {location.email || t('admin.notSpecified')}
              </p>
            </div>

            <div>
              <Label className="text-sm font-medium">{t('admin.locationAddress')}</Label>
              <p className="text-sm text-muted-foreground">
                {location.address || t('admin.notSpecified')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{t('admin.locationInfoEdit')}</CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleCancel}>
            <X className="mr-2 h-4 w-4" />
            {t('admin.cancel')}
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            <Save className="mr-2 h-4 w-4" />
            {loading ? t('admin.saving') : t('admin.save')}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">{t('admin.locationName')} *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              required
            />
          </div>

          <div>
            <Label htmlFor="city">{t('admin.locationCity')}</Label>
            <Input
              id="city"
              value={formData.city || ''}
              onChange={(e) => setFormData({...formData, city: e.target.value})}
            />
          </div>

          <div>
            <Label htmlFor="country">{t('admin.locationCountry')}</Label>
            <Input
              id="country"
              value={formData.country || ''}
              onChange={(e) => setFormData({...formData, country: e.target.value})}
            />
          </div>

          <div>
            <Label htmlFor="is_active">{t('admin.status')}</Label>
            <Select
              value={formData.is_active ? "true" : "false"}
              onValueChange={(value) => setFormData({...formData, is_active: value === "true"})}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">{t('admin.active')}</SelectItem>
                <SelectItem value="false">{t('admin.archived')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="phone">{t('admin.locationPhone')}</Label>
            <Input
              id="phone"
              value={formData.phone || ''}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
            />
          </div>

          <div>
            <Label htmlFor="email">{t('admin.locationEmail')}</Label>
            <Input
              id="email"
              type="email"
              value={formData.email || ''}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
            />
          </div>

          <div>
            <Label htmlFor="address">{t('admin.locationAddress')}</Label>
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