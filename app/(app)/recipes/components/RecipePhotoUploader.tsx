'use client'

import { useState, useRef } from 'react'
import { Upload, Loader2, ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createSupabaseBrowserClient } from '@/utils/supabase/client'
import { toast } from 'sonner'
import Image from 'next/image'

interface RecipePhotoUploaderProps {
  currentUrl?: string
  onPhotoUpdate: (url: string) => void
  disabled?: boolean
}

export function RecipePhotoUploader({ currentUrl, onPhotoUpdate, disabled }: RecipePhotoUploaderProps) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(currentUrl || null)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type and size
    if (!file.type.startsWith('image/')) {
      toast.error('Seleziona un file immagine valido')
      return
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB
      toast.error('Il file è troppo grande. Max 5MB.')
      return
    }

    setIsUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/v1/recipes/upload-photo', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Upload failed')
      }

      const { url } = await response.json()
      setPhotoUrl(url)
      onPhotoUpdate(url)
      toast.success('Foto caricata con successo!')

    } catch (error: any) {
      console.error('Photo upload error:', error)
      toast.error(`Errore caricamento: ${error.message}`)
    } finally {
      setIsUploading(false)
      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Foto ricetta</p>
      </div>

      {/* Photo preview */}
      <div className="relative w-full aspect-video bg-muted rounded-lg overflow-hidden border-2 border-dashed border-border">
        {photoUrl ? (
          <Image
            src={photoUrl}
            alt="Recipe photo"
            fill
            className="object-cover"
            onError={() => setPhotoUrl(null)}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <ImageIcon className="w-12 h-12" />
            <p className="text-sm">Nessuna foto</p>
          </div>
        )}
      </div>

      {/* Upload button */}
      <div className="space-y-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleUpload}
          className="hidden"
          disabled={isUploading || disabled}
        />
        <Button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading || disabled}
          variant="outline"
          size="sm"
          className="w-full"
        >
          {isUploading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Upload className="h-4 w-4 mr-2" />
          )}
          {isUploading ? 'Caricamento...' : photoUrl ? 'Cambia foto' : 'Carica foto'}
        </Button>
        <p className="text-xs text-muted-foreground text-center">
          Formati: JPG, PNG, WEBP. Max 5MB.
        </p>
      </div>
    </div>
  )
}
