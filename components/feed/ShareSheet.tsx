'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Share2, Link as LinkIcon, Copy } from 'lucide-react'

interface ShareSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  postId: string
  onShare: (shareComment?: string) => Promise<void>
}

export function ShareSheet({ open, onOpenChange, postId, onShare }: ShareSheetProps) {
  const [shareComment, setShareComment] = useState('')
  const [isSharing, setIsSharing] = useState(false)

  const postUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/feed?postId=${postId}`
    : ''

  const handleShare = async () => {
    setIsSharing(true)
    try {
      await onShare(shareComment)
      toast.success('Post condiviso con successo')
      onOpenChange(false)
      setShareComment('')
    } catch (error: any) {
      toast.error(error.message || 'Errore durante la condivisione')
    } finally {
      setIsSharing(false)
    }
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(postUrl)
      toast.success('Link copiato negli appunti')
    } catch (error) {
      toast.error('Errore durante la copia del link')
    }
  }

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Condividi Post',
          url: postUrl,
        })
      } catch (error) {
        // User cancelled share
      }
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-xl">
        <SheetHeader>
          <SheetTitle>Condividi Post</SheetTitle>
        </SheetHeader>
        
        <div className="space-y-4 py-4">
          <Textarea
            placeholder="Aggiungi un commento (opzionale)..."
            value={shareComment}
            onChange={(e) => setShareComment(e.target.value)}
            rows={3}
          />

          <div className="grid gap-2">
            <Button
              onClick={handleShare}
              disabled={isSharing}
              className="h-12"
            >
              <Share2 className="mr-2 h-5 w-5" />
              Condividi nel Feed
            </Button>

            <Button
              variant="outline"
              onClick={handleCopyLink}
              className="h-12"
            >
              <Copy className="mr-2 h-5 w-5" />
              Copia Link
            </Button>

            {typeof navigator !== 'undefined' && 'share' in navigator && (
              <Button
                variant="outline"
                onClick={handleNativeShare}
                className="h-12"
              >
                <LinkIcon className="mr-2 h-5 w-5" />
                Condividi via...
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
