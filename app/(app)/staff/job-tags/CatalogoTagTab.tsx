'use client'

import { useState, useEffect } from 'react'
import { useAppStore } from '@/lib/store/unified'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Plus, Edit, Power, Sparkles } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'

type JobTag = {
  id: string
  label_it: string
  key: string
  categoria: string | null
  color: string | null
  is_active: boolean
}

const CATEGORIE = ['Direzione', 'Cucina', 'Sala', 'Trasversali']
const DEFAULT_COLORS: Record<string, string> = {
  Direzione: '#8B5CF6',
  Cucina: '#EF4444',
  Sala: '#10B981',
  Trasversali: '#6B7280',
}

export function CatalogoTagTab() {
  const hasHydrated = useAppStore(state => state.hasHydrated)
  const [tags, setTags] = useState<JobTag[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTag, setEditingTag] = useState<JobTag | null>(null)
  const [formData, setFormData] = useState({
    label_it: '',
    categoria: '',
    color: '',
  })

  useEffect(() => {
    if (!hasHydrated) return
    fetchTags()
  }, [hasHydrated])

  const fetchTags = async () => {
    try {
      const res = await fetch('/api/v1/admin/job-tags', { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setTags(data.jobTags || [])
    } catch (error) {
      toast.error('Errore nel caricamento dei tag')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingTag(null)
    setFormData({ label_it: '', categoria: '', color: '' })
    setDialogOpen(true)
  }

  const handleEdit = (tag: JobTag) => {
    setEditingTag(tag)
    setFormData({
      label_it: tag.label_it,
      categoria: tag.categoria || '',
      color: tag.color || '',
    })
    setDialogOpen(true)
  }

  const handleSubmit = async () => {
    try {
      const payload = {
        ...formData,
        color: formData.color || (formData.categoria ? DEFAULT_COLORS[formData.categoria] : null),
      }

      const res = editingTag
        ? await fetch(`/api/v1/admin/job-tags/${editingTag.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            credentials: 'include',
          })
        : await fetch('/api/v1/admin/job-tags', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            credentials: 'include',
          })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Errore di salvataggio')
      }

      toast.success(editingTag ? 'Tag aggiornato' : 'Tag creato')
      setDialogOpen(false)
      fetchTags()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const handleToggleActive = async (tag: JobTag) => {
    try {
      const res = await fetch(`/api/v1/admin/job-tags/${tag.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !tag.is_active }),
        credentials: 'include',
      })

      if (!res.ok) throw new Error('Failed to update')

      toast.success(tag.is_active ? 'Tag disattivato' : 'Tag attivato')
      fetchTags()
    } catch (error) {
      toast.error('Errore di aggiornamento')
    }
  }

  const handleInsertPreset = async () => {
    if (!confirm('Vuoi inserire il set consigliato di ruoli per ristorazione? I ruoli già esistenti non verranno duplicati.')) {
      return
    }

    try {
      const res = await fetch('/api/v1/admin/job-tags/preset', { method: 'POST', credentials: 'include' })
      if (!res.ok) throw new Error('Failed to insert preset')

      const data = await res.json()
      toast.success(data.message || 'Set consigliato inserito')
      fetchTags()
    } catch (error) {
      toast.error('Errore inserimento preset')
    }
  }

  if (loading) {
    return <div className="text-center py-8">Caricamento...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Nuovo Tag
          </Button>
          <Button variant="outline" onClick={handleInsertPreset}>
            <Sparkles className="h-4 w-4 mr-2" />
            Set Consigliato Ristorazione
          </Button>
        </div>
      </div>

      {tags.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          Nessun tag disponibile. Crea un Job Tag per iniziare.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Label</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Colore</TableHead>
              <TableHead>Stato</TableHead>
              <TableHead className="text-right">Azioni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tags.map((tag) => (
              <TableRow key={tag.id}>
                <TableCell className="font-medium">{tag.label_it}</TableCell>
                <TableCell>
                  {tag.categoria ? (
                    <Badge variant="outline">{tag.categoria}</Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  {tag.color ? (
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded border"
                        style={{ backgroundColor: tag.color }}
                      />
                      <span className="text-sm text-muted-foreground">{tag.color}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={tag.is_active ? 'default' : 'secondary'}>
                    {tag.is_active ? 'Attivo' : 'Disattivo'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(tag)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleToggleActive(tag)}
                    >
                      <Power className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTag ? 'Modifica Tag' : 'Nuovo Tag'}</DialogTitle>
            <DialogDescription>
              Inserisci i dettagli del ruolo
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="label">Nome *</Label>
              <Input
                id="label"
                value={formData.label_it}
                onChange={(e) => setFormData({ ...formData, label_it: e.target.value })}
                placeholder="Es. Cameriere"
              />
            </div>

            <div>
              <Label htmlFor="categoria">Categoria</Label>
              <Select
                value={formData.categoria}
                onValueChange={(val) => setFormData({ ...formData, categoria: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona categoria" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIE.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="color">Colore</Label>
              
              {/* Color picker nativo + Input HEX + Preview */}
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  id="color-picker"
                  value={formData.color || '#6B7280'}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value.toUpperCase() })}
                  className="w-14 h-10 rounded border cursor-pointer"
                  title="Seleziona colore"
                />
                
                <Input
                  id="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value.toUpperCase() })}
                  placeholder="#10B981"
                  className="flex-1 font-mono"
                  maxLength={7}
                />
                
                {formData.color && (
                  <div
                    className="w-10 h-10 rounded border shrink-0"
                    style={{ backgroundColor: formData.color }}
                    title={formData.color}
                  />
                )}
              </div>
              
              {/* Palette colori predefiniti */}
              <div className="mt-3">
                <p className="text-sm text-muted-foreground mb-2">Colori rapidi:</p>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { name: 'Viola', hex: '#8B5CF6' },
                    { name: 'Rosso', hex: '#EF4444' },
                    { name: 'Verde', hex: '#10B981' },
                    { name: 'Blu', hex: '#3B82F6' },
                    { name: 'Giallo', hex: '#F59E0B' },
                    { name: 'Rosa', hex: '#EC4899' },
                    { name: 'Teal', hex: '#14B8A6' },
                    { name: 'Arancione', hex: '#F97316' },
                    { name: 'Indigo', hex: '#6366F1' },
                    { name: 'Lime', hex: '#84CC16' },
                  ].map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => setFormData({ ...formData, color: c.hex })}
                      className="w-9 h-9 rounded border-2 hover:scale-110 transition-transform"
                      style={{ 
                        backgroundColor: c.hex,
                        borderColor: formData.color === c.hex ? '#000' : 'transparent'
                      }}
                      title={`${c.name} (${c.hex})`}
                    />
                  ))}
                </div>
              </div>
              
              {formData.categoria && !formData.color && (
                <p className="text-xs text-muted-foreground mt-2">
                  Verrà utilizzato il colore predefinito per {formData.categoria}
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>
              Annulla
            </Button>
            <Button onClick={handleSubmit} disabled={!formData.label_it}>
              {editingTag ? 'Salva' : 'Crea'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
