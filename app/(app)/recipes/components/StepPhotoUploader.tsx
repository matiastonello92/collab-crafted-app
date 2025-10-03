'use client'

import { useState, useRef } from 'react'
import { Upload, Loader2, ImageIcon, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import Image from 'next/image'

interface StepPhotoUploaderProps {
  recipeId: string
  stepId: string
  currentUrl?: string
  onPhotoUpdate: (url: string) => void
  disabled?: boolean
}

export function StepPhotoUploader({ 
  recipeId, 
  stepId, 
  currentUrl, 
  onPhotoUpdate, 
  disabled 
}: StepPhotoUploaderProps) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(currentUrl || null)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Seleziona un file immagine valido')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Il file è troppo grande. Max 5MB.')
      return
    }

    setIsUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('stepId', stepId)

      const response = await fetch(`/api/v1/recipes/${recipeId}/steps/upload-photo`, {
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
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleRemove = () => {
    setPhotoUrl(null)
    onPhotoUpdate('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-2">
      {photoUrl ? (
        <div className="relative w-full aspect-video bg-muted rounded-lg overflow-hidden border">
          <Image
            src={photoUrl}
            alt="Step photo"
            fill
            className="object-cover"
            onError={() => setPhotoUrl(null)}
          />
          {!disabled && (
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2"
              onClick={handleRemove}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      ) : (
        <div className="relative w-full aspect-video bg-muted rounded-lg overflow-hidden border-2 border-dashed border-border">
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <ImageIcon className="w-8 h-8" />
            <p className="text-xs">Foto opzionale</p>
          </div>
        </div>
      )}

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
          <Loader2 className="h-3 w-3 mr-2 animate-spin" />
        ) : (
          <Upload className="h-3 w-3 mr-2" />
        )}
        {isUploading ? 'Caricamento...' : photoUrl ? 'Cambia foto' : 'Carica foto'}
      </Button>
    </div>
  )
}
