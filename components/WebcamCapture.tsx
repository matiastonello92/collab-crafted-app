'use client'

import { useEffect, useRef, useState } from 'react'
import { Camera, X, RotateCw, Check, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { useTranslation } from '@/lib/i18n'

interface WebcamCaptureProps {
  open: boolean
  onCapture: (blob: Blob) => void
  onClose: () => void
}

export function WebcamCapture({ open, onCapture, onClose }: WebcamCaptureProps) {
  const { t } = useTranslation()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [hasPhoto, setHasPhoto] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Start webcam stream
  useEffect(() => {
    if (!open) return

    let timeoutId: NodeJS.Timeout

    const startWebcam = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        // Safety timeout: if still loading after 5s, show error
        timeoutId = setTimeout(() => {
          setError(t('common.webcam.genericError'))
          setIsLoading(false)
        }, 5000)
        
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user'
          }
        })
        
        streamRef.current = stream
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          
          // With autoPlay, video starts automatically
          // Use onloadeddata to know when it's ready
          videoRef.current.onloadeddata = () => {
            clearTimeout(timeoutId)
            setIsLoading(false)
          }
        } else {
          clearTimeout(timeoutId)
          setIsLoading(false)
        }
      } catch (err: any) {
        console.error('Webcam error:', err)
        clearTimeout(timeoutId)
        setIsLoading(false)
        
        if (err.name === 'NotAllowedError') {
          setError(t('common.webcam.permissionDenied'))
        } else if (err.name === 'NotFoundError') {
          setError(t('common.webcam.notFound'))
        } else {
          setError(t('common.webcam.genericError'))
        }
      }
    }

    startWebcam()

    // Cleanup when component unmounts or open changes
    return () => {
      clearTimeout(timeoutId)
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          track.stop()
          console.log('useEffect cleanup - Track stopped:', track.kind)
        })
        streamRef.current = null
      }
      
      if (videoRef.current) {
        videoRef.current.onloadeddata = null
        videoRef.current.srcObject = null
      }
    }
  }, [open, t])

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.drawImage(video, 0, 0)
    setHasPhoto(true)
  }

  const retakePhoto = () => {
    setHasPhoto(false)
  }

  const confirmPhoto = () => {
    if (!canvasRef.current) return

    canvasRef.current.toBlob((blob) => {
      if (blob) {
        onCapture(blob)
        handleClose()
      } else {
        toast.error(t('common.webcam.captureError'))
      }
    }, 'image/jpeg', 0.95)
  }

  const handleClose = () => {
    // Stop webcam tracks immediately
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop()
        console.log('handleClose - Track stopped:', track.kind)
      })
      streamRef.current = null
    }
    
    // Reset state
    setHasPhoto(false)
    setError(null)
    setIsLoading(true)
    
    // Close dialog (this triggers re-render with open=false)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('common.webcam.title')}</DialogTitle>
          <DialogDescription>
            {t('common.webcam.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Error State */}
          {error && (
            <div className="p-4 bg-destructive/10 text-destructive rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Webcam Preview */}
          {!error && (
            <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${hasPhoto ? 'hidden' : ''}`}
            />
              <canvas
                ref={canvasRef}
                className={`w-full h-full object-cover ${!hasPhoto ? 'hidden' : ''}`}
              />
              
              {isLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50">
                  <Loader2 className="h-8 w-8 text-white animate-spin mb-2" />
                  <div className="text-white text-sm">{t('common.webcam.loading')}</div>
                </div>
              )}
            </div>
          )}

          {/* Controls */}
          {!error && (
            <div className="flex gap-2 justify-center">
              {!hasPhoto ? (
                <Button
                  onClick={capturePhoto}
                  disabled={isLoading}
                  size="lg"
                  className="gap-2"
                >
                  <Camera className="h-5 w-5" />
                  {t('common.webcam.capture')}
                </Button>
              ) : (
                <>
                  <Button
                    onClick={retakePhoto}
                    variant="outline"
                    size="lg"
                    className="gap-2"
                  >
                    <RotateCw className="h-5 w-5" />
                    {t('common.webcam.retake')}
                  </Button>
                  <Button
                    onClick={confirmPhoto}
                    size="lg"
                    className="gap-2"
                  >
                    <Check className="h-5 w-5" />
                    {t('common.webcam.confirm')}
                  </Button>
                </>
              )}
            </div>
          )}

          {/* Close Button */}
          <Button
            onClick={handleClose}
            variant="ghost"
            size="sm"
            className="w-full"
          >
            {t('common.actions.cancel')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
