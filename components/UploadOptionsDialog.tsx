'use client'

import { Upload, Camera } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { useTranslation } from '@/lib/i18n'
import { useBreakpoint } from '@/hooks/useBreakpoint'

interface UploadOptionsDialogProps {
  open: boolean
  onClose: () => void
  onUploadFile: () => void
  onUseWebcam: () => void
}

export function UploadOptionsDialog({ 
  open, 
  onClose, 
  onUploadFile,
  onUseWebcam
}: UploadOptionsDialogProps) {
  const { t } = useTranslation()
  const { isMobile } = useBreakpoint()

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl sm:text-2xl">
            {t('profile.uploadPhotoTitle')}
          </DialogTitle>
          <DialogDescription className="text-sm sm:text-base">
            {t('profile.uploadPhotoDescription')}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-3 py-4">
          {/* Upload File Button */}
          <Button 
            onClick={onUploadFile}
            variant="outline"
            className="w-full min-h-[56px] sm:h-20 text-base sm:text-lg"
          >
            <Upload className="h-6 w-6 mr-3" />
            {t('common.avatarUploader.uploadFile')}
          </Button>

          {/* Use Camera/Webcam Button */}
          <Button 
            onClick={onUseWebcam}
            variant="outline"
            className="w-full min-h-[56px] sm:h-20 text-base sm:text-lg"
          >
            <Camera className="h-6 w-6 mr-3" />
            {isMobile 
              ? t('common.avatarUploader.useCamera') || t('common.avatarUploader.useWebcam')
              : t('common.avatarUploader.useWebcam')
            }
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          {t('common.avatarUploader.formatInfo')}
        </p>
      </DialogContent>
    </Dialog>
  )
}
