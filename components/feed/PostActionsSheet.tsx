'use client'

import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Heart, MessageCircle, Share2, Flag, EyeOff } from 'lucide-react'

interface PostActionsSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onLike?: () => void
  onComment?: () => void
  onShare?: () => void
  onReport?: () => void
  onHide?: () => void
  isLiked?: boolean
  canModerate?: boolean
}

export function PostActionsSheet({
  open,
  onOpenChange,
  onLike,
  onComment,
  onShare,
  onReport,
  onHide,
  isLiked,
  canModerate,
}: PostActionsSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-xl">
        <SheetHeader>
          <SheetTitle>Azioni Post</SheetTitle>
        </SheetHeader>
        
        <div className="grid gap-2 py-4">
          {onLike && (
            <Button
              variant="ghost"
              className="justify-start h-14"
              onClick={() => {
                onLike()
                onOpenChange(false)
              }}
            >
              <Heart className={`mr-3 h-5 w-5 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
              <span>{isLiked ? 'Rimuovi Mi Piace' : 'Mi Piace'}</span>
            </Button>
          )}

          {onComment && (
            <Button
              variant="ghost"
              className="justify-start h-14"
              onClick={() => {
                onComment()
                onOpenChange(false)
              }}
            >
              <MessageCircle className="mr-3 h-5 w-5" />
              <span>Commenta</span>
            </Button>
          )}

          {onShare && (
            <Button
              variant="ghost"
              className="justify-start h-14"
              onClick={() => {
                onShare()
                onOpenChange(false)
              }}
            >
              <Share2 className="mr-3 h-5 w-5" />
              <span>Condividi</span>
            </Button>
          )}

          {onReport && (
            <Button
              variant="ghost"
              className="justify-start h-14 text-orange-600"
              onClick={() => {
                onReport()
                onOpenChange(false)
              }}
            >
              <Flag className="mr-3 h-5 w-5" />
              <span>Segnala</span>
            </Button>
          )}

          {canModerate && onHide && (
            <Button
              variant="ghost"
              className="justify-start h-14 text-destructive"
              onClick={() => {
                onHide()
                onOpenChange(false)
              }}
            >
              <EyeOff className="mr-3 h-5 w-5" />
              <span>Nascondi Post</span>
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
