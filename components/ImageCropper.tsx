'use client'

import { useState, useCallback } from 'react'
import Cropper from 'react-easy-crop'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { ZoomIn, ZoomOut, Check, X } from 'lucide-react'
import { useTranslation } from '@/lib/i18n'

interface ImageCropperProps {
  open: boolean
  imageSrc: string
  onCropComplete: (croppedBlob: Blob) => void
  onCancel: () => void
}

interface CropArea {
  x: number
  y: number
  width: number
  height: number
}

export function ImageCropper({ open, imageSrc, onCropComplete, onCancel }: ImageCropperProps) {
  const { t } = useTranslation()
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<CropArea | null>(null)

  const onCropChange = (crop: { x: number; y: number }) => setCrop(crop)
  const onZoomChange = (zoom: number) => setZoom(zoom)

  const onCropCompleteInternal = useCallback((croppedArea: any, croppedAreaPixels: CropArea) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  const handleConfirm = async () => {
    if (!croppedAreaPixels) return
    
    const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels)
    onCropComplete(croppedBlob)
  }

  return (
    <Dialog open={open} onOpenChange={onCancel}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t('profile.cropImage')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Cropper Area */}
          <div className="relative h-[400px] bg-black rounded-lg overflow-hidden">
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              onCropChange={onCropChange}
              onZoomChange={onZoomChange}
              onCropComplete={onCropCompleteInternal}
              objectFit="contain"
            />
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center gap-4 px-2">
            <ZoomOut className="h-4 w-4 text-muted-foreground" />
            <Slider
              value={[zoom]}
              onValueChange={([value]) => setZoom(value)}
              min={1}
              max={3}
              step={0.1}
              className="flex-1"
            />
            <ZoomIn className="h-4 w-4 text-muted-foreground" />
          </div>

          <p className="text-xs text-muted-foreground text-center">
            {t('profile.dragToReposition')}
          </p>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button onClick={onCancel} variant="outline" className="flex-1">
              <X className="h-4 w-4 mr-2" />
              {t('common.actions.cancel')}
            </Button>
            <Button onClick={handleConfirm} className="flex-1">
              <Check className="h-4 w-4 mr-2" />
              {t('profile.applyCrop')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Helper function to create cropped image
async function getCroppedImg(imageSrc: string, pixelCrop: CropArea): Promise<Blob> {
  const image = await createImage(imageSrc)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    throw new Error('No 2d context')
  }

  canvas.width = pixelCrop.width
  canvas.height = pixelCrop.height

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  )

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob)
      } else {
        reject(new Error('Canvas is empty'))
      }
    }, 'image/jpeg', 0.95)
  })
}

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', (error) => reject(error))
    image.setAttribute('crossOrigin', 'anonymous')
    image.src = url
  })
}
