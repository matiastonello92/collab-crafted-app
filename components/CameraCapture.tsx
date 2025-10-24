'use client'

import { useRef, ChangeEvent } from 'react'
import { Camera } from 'lucide-react'
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
import { WebcamCapture } from './WebcamCapture'

interface CameraCaptureProps {
  open: boolean
  onCapture: (blob: Blob) => void
  onClose: () => void
}

export function CameraCapture({ open, onCapture, onClose }: CameraCaptureProps) {
  const { t } = useTranslation()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { isMobile } = useBreakpoint()
  
  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onCapture(file)
      onClose()
    }
  }
  
  // Mobile: usa input file con capture nativa
  if (isMobile) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">{t('common.webcam.title')}</DialogTitle>
            <DialogDescription>
              {t('common.webcam.description')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button 
              onClick={() => fileInputRef.current?.click()}
              className="w-full min-h-[56px] text-base"
            >
              <Camera className="mr-2 h-5 w-5" />
              {t('common.webcam.openCamera')}
            </Button>
            <Button 
              onClick={onClose}
              variant="outline"
              className="w-full min-h-[56px] text-base"
            >
              {t('common.actions.cancel')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }
  
  // Desktop: usa WebcamCapture con getUserMedia
  return <WebcamCapture open={open} onCapture={onCapture} onClose={onClose} />
}
