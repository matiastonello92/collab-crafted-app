'use client'

import { useState, useEffect } from 'react'
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
    fetchTags()
  }, [])

  const fetchTags = async () => {
    try {
      const res = await fetch('/api/v1/admin/job-tags')
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
          })
        : await fetch('/api/v1/admin/job-tags', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
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
      const res = await fetch('/api/v1/admin/job-tags/preset', { method: 'POST' })
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
              <Label htmlFor="color">Colore (HEX)</Label>
              <div className="flex gap-2">
                <Input
                  id="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  placeholder="#10B981"
                />
                {formData.color && (
                  <div
                    className="w-10 h-10 rounded border"
                    style={{ backgroundColor: formData.color }}
                  />
                )}
              </div>
              {formData.categoria && !formData.color && (
                <p className="text-xs text-muted-foreground mt-1">
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
