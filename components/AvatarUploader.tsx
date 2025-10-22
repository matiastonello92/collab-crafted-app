'use client'

import { useState, useRef } from 'react'
import { Camera, Loader2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { WebcamCapture } from './WebcamCapture'
import { ImageCropper } from './ImageCropper'
import { AvatarDialog } from './AvatarDialog'
import { UploadOptionsDialog } from './UploadOptionsDialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { createSupabaseBrowserClient } from '@/utils/supabase/client'
import { toast } from 'sonner'
import { useTranslation } from '@/lib/i18n'

interface AvatarUploaderProps {
  orgId: string
  userId: string
  currentUrl?: string
  userName?: string
  onAvatarUpdate?: (url: string) => void
  mode?: 'inline' | 'header'
}

export function AvatarUploader({ 
  orgId, 
  userId, 
  currentUrl, 
  userName = 'User',
  onAvatarUpdate,
  mode = 'inline'
}: AvatarUploaderProps) {
  const { t } = useTranslation()
  const [avatarUrl, setAvatarUrl] = useState<string | null>(currentUrl || null)
  const [isUploading, setIsUploading] = useState(false)
  const [showWebcam, setShowWebcam] = useState(false)
  const [showAvatarDialog, setShowAvatarDialog] = useState(false)
  const [showUploadOptions, setShowUploadOptions] = useState(false)
  const [showImageCropper, setShowImageCropper] = useState(false)
  const [imageToUpload, setImageToUpload] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createSupabaseBrowserClient()

  const loadCurrentAvatar = async () => {
    try {
      const key = `${orgId}/${userId}/avatar.jpg`
      const { data } = await supabase.storage.from('avatars').list(orgId + '/' + userId)
      
      if (data && data.length > 0) {
        const publicUrl = supabase.storage.from('avatars').getPublicUrl(key).data.publicUrl
        setAvatarUrl(publicUrl)
        onAvatarUpdate?.(publicUrl)
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

  const uploadCroppedImage = async (blob: Blob) => {
    setIsUploading(true)

    try {
      const key = `${orgId}/${userId}/avatar.jpg`
      const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' })
      
      const { error } = await supabase.storage
        .from('avatars')
        .upload(key, file, {
          upsert: true,
          contentType: 'image/jpeg'
        })

      if (error) throw new Error(error.message)

      const publicUrl = supabase.storage.from('avatars').getPublicUrl(key).data.publicUrl
      
      // Update database directly
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', userId)
      
      if (updateError) {
        console.error('Failed to update profile avatar:', updateError)
        toast.error(t('common.avatarUploader.uploadError').replace('{error}', updateError.message))
        return
      }

      setAvatarUrl(publicUrl)
      onAvatarUpdate?.(publicUrl)
      toast.success(t('common.avatarUploader.uploadSuccess'))

    } catch (error: any) {
      console.error('Avatar upload error:', error)
      toast.error(t('common.avatarUploader.uploadError').replace('{error}', error.message))
    } finally {
      setIsUploading(false)
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error(t('common.avatarUploader.invalidFile'))
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('common.avatarUploader.fileTooLarge'))
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const imageDataUrl = e.target?.result as string
      setImageToUpload(imageDataUrl)
      setShowImageCropper(true)
      setShowUploadOptions(false)
    }
    reader.readAsDataURL(file)

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleWebcamCapture = (blob: Blob) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const imageDataUrl = e.target?.result as string
      setImageToUpload(imageDataUrl)
      setShowImageCropper(true)
      setShowWebcam(false)
    }
    reader.readAsDataURL(blob)
  }

  const handleCropComplete = async (croppedBlob: Blob) => {
    setShowImageCropper(false)
    await uploadCroppedImage(croppedBlob)
  }

  const handleAvatarClick = () => {
    setShowAvatarDialog(true)
  }

  const handleViewPhoto = () => {
    if (avatarUrl) {
      window.open(avatarUrl, '_blank')
    }
    setShowAvatarDialog(false)
  }

  const handleChangePhoto = () => {
    setShowAvatarDialog(false)
    setShowUploadOptions(true)
  }

  if (mode === 'header') {
    return (
      <>
        <button 
          onClick={handleAvatarClick}
          className="relative group cursor-pointer"
          disabled={isUploading}
        >
          <Avatar className="h-16 w-16 ring-2 ring-border hover:ring-primary transition-all">
            {avatarUrl && (
              <AvatarImage 
                src={avatarUrl} 
                alt={userName}
                onError={() => setAvatarUrl(null)} 
              />
            )}
            <AvatarFallback className="text-lg">
              {userName.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Camera className="h-6 w-6 text-white" />
          </div>
        </button>

        <AvatarDialog
          open={showAvatarDialog}
          onClose={() => setShowAvatarDialog(false)}
          hasAvatar={!!avatarUrl}
          avatarUrl={avatarUrl}
          userName={userName}
          onViewPhoto={handleViewPhoto}
          onChangePhoto={handleChangePhoto}
        />

        {/* Upload Options Dialog */}
        <UploadOptionsDialog
          open={showUploadOptions}
          onClose={() => setShowUploadOptions(false)}
          onUploadFile={() => {
            setShowUploadOptions(false)
            fileInputRef.current?.click()
          }}
          onUseWebcam={() => {
            setShowUploadOptions(false)
            setShowWebcam(true)
          }}
        />

        {/* File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        <WebcamCapture
          open={showWebcam}
          onCapture={handleWebcamCapture}
          onClose={() => setShowWebcam(false)}
        />

        {imageToUpload && (
          <ImageCropper
            open={showImageCropper}
            imageSrc={imageToUpload}
            onCropComplete={handleCropComplete}
            onCancel={() => {
              setShowImageCropper(false)
              setImageToUpload(null)
            }}
          />
        )}
      </>
    )
  }

  // Inline mode (original behavior for profile page)
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
        
        <div className="flex gap-2">
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

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          disabled={isUploading}
        />
      </div>

      <WebcamCapture
        open={showWebcam}
        onCapture={handleWebcamCapture}
        onClose={() => setShowWebcam(false)}
      />

      {imageToUpload && (
        <ImageCropper
          open={showImageCropper}
          imageSrc={imageToUpload}
          onCropComplete={handleCropComplete}
          onCancel={() => {
            setShowImageCropper(false)
            setImageToUpload(null)
          }}
        />
      )}
    </div>
  )
}
