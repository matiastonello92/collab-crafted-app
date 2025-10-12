'use client'

import { useState, useRef } from 'react'
import { Camera, Loader2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { WebcamCapture } from './WebcamCapture'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { createSupabaseBrowserClient } from '@/utils/supabase/client'
import { toast } from 'sonner'
import { useTranslation } from '@/lib/i18n'

interface AvatarUploaderProps {
  orgId: string
  userId: string
  currentUrl?: string
  onAvatarUpdate?: (url: string) => void
}

export function AvatarUploader({ orgId, userId, currentUrl, onAvatarUpdate }: AvatarUploaderProps) {
  const { t } = useTranslation()
  const [avatarUrl, setAvatarUrl] = useState<string | null>(currentUrl || null)
  const [isUploading, setIsUploading] = useState(false)
  const [showWebcam, setShowWebcam] = useState(false)
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
      toast.error(t('common.avatarUploader.invalidFile'))
      return
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB
      toast.error(t('common.avatarUploader.fileTooLarge'))
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
      toast.success(t('common.avatarUploader.uploadSuccess'))

    } catch (error: any) {
      console.error('Avatar upload error:', error)
      toast.error(t('common.avatarUploader.uploadError').replace('{error}', error.message))
    } finally {
      setIsUploading(false)
      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleWebcamCapture = async (blob: Blob) => {
    setIsUploading(true)

    try {
      const key = `${orgId}/${userId}/avatar.jpg`
      
      // Convert blob to File
      const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' })
      
      // Upload to storage with upsert to overwrite existing
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(key, file, {
          upsert: true,
          contentType: 'image/jpeg'
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
      toast.success(t('common.avatarUploader.uploadSuccess'))

    } catch (error: any) {
      console.error('Webcam upload error:', error)
      toast.error(t('common.avatarUploader.uploadError').replace('{error}', error.message))
    } finally {
      setIsUploading(false)
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
        <p className="text-sm font-medium">{t('common.avatarUploader.profilePhoto')}</p>
        
        {/* Pulsanti */}
        <div className="flex gap-2">
          {/* File Upload Button */}
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
            {t('common.avatarUploader.uploadFile')}
          </Button>

          {/* Webcam Button */}
          <Button
            onClick={() => setShowWebcam(true)}
            disabled={isUploading}
            variant="outline"
            size="sm"
          >
            <Camera className="h-4 w-4 mr-2" />
            {t('common.avatarUploader.useWebcam')}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          {t('common.avatarUploader.formatInfo')}
        </p>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleUpload}
          className="hidden"
          disabled={isUploading}
        />
      </div>

      {/* Webcam Modal */}
      <WebcamCapture
        open={showWebcam}
        onCapture={handleWebcamCapture}
        onClose={() => setShowWebcam(false)}
      />
    </div>
  )
}