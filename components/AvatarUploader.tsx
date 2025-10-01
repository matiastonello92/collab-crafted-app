'use client'

import { useState, useRef } from 'react'
import { Upload, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface AvatarUploaderProps {
  orgId: string
  userId: string
  currentUrl?: string
  onAvatarUpdate?: (url: string) => void
}

export function AvatarUploader({ orgId, userId, currentUrl, onAvatarUpdate }: AvatarUploaderProps) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(currentUrl || null)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createSupabaseBrowserClient()

  const loadCurrentAvatar = async () => {
    try {
      const key = `${orgId}/${userId}/avatar.jpg`
      const response = await fetch(`/api/storage/signed-download?bucket=avatars&name=${key}`)
      
      if (response.ok) {
        const { url } = await response.json()
        setAvatarUrl(url)
        onAvatarUpdate?.(url)
      }
    } catch (error) {
      // Avatar doesn't exist or can't be loaded, that's ok
    }
  }

  // Load current avatar on mount if no currentUrl provided
  useState(() => {
    if (!currentUrl) {
      loadCurrentAvatar()
    }
  })

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
      const key = `${orgId}/${userId}/avatar.jpg`
      
      // Upload to storage with upsert to overwrite existing
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(key, file, {
          upsert: true,
          contentType: file.type
        })

      if (error) {
        throw new Error(error.message)
      }

      // Get signed URL for immediate display
      const response = await fetch(`/api/storage/signed-download?bucket=avatars&name=${key}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to get signed URL')
      }

      const { url } = await response.json()
      setAvatarUrl(url)
      onAvatarUpdate?.(url)
      toast.success('Avatar aggiornato con successo!')

    } catch (error: any) {
      console.error('Avatar upload error:', error)
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
    <div className="flex items-center gap-6">
      <Avatar className="h-20 w-20">
        {avatarUrl && (
          <AvatarImage 
            src={avatarUrl} 
            alt="Avatar"
            onError={() => setAvatarUrl(null)} 
          />
        )}
        <AvatarFallback className="text-lg">
          {userId.substring(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      
      <div className="space-y-2">
        <p className="text-sm font-medium">Foto profilo</p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleUpload}
          className="hidden"
          disabled={isUploading}
        />
        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          variant="outline"
          size="sm"
        >
          {isUploading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Upload className="h-4 w-4 mr-2" />
          )}
          {isUploading ? 'Caricamento...' : 'Cambia foto'}
        </Button>
        <p className="text-xs text-muted-foreground">
          Formati: JPG, PNG, GIF. Max 5MB.
        </p>
      </div>
    </div>
  )
}