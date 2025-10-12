'use client'

import { Eye, Camera, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { useTranslation } from '@/lib/i18n'

interface AvatarDialogProps {
  open: boolean
  onClose: () => void
  hasAvatar: boolean
  avatarUrl: string | null
  userName: string
  onViewPhoto: () => void
  onChangePhoto: () => void
}

export function AvatarDialog({ 
  open, 
  onClose, 
  hasAvatar, 
  avatarUrl,
  userName,
  onViewPhoto,
  onChangePhoto 
}: AvatarDialogProps) {
  const { t } = useTranslation()

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {hasAvatar ? t('profile.manageAvatar') : t('profile.addAvatar')}
          </DialogTitle>
        </DialogHeader>
        
        {hasAvatar ? (
          <div className="space-y-4">
            {/* Preview avatar */}
            <div className="flex justify-center py-4">
              <Avatar className="h-32 w-32 ring-2 ring-border">
                <AvatarImage src={avatarUrl || undefined} alt={userName} />
                <AvatarFallback className="text-3xl">
                  {userName.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
            
            {/* Actions */}
            <div className="flex gap-3">
              <Button onClick={onViewPhoto} variant="outline" className="flex-1">
                <Eye className="h-4 w-4 mr-2" />
                {t('profile.viewPhoto')}
              </Button>
              <Button onClick={onChangePhoto} className="flex-1">
                <Camera className="h-4 w-4 mr-2" />
                {t('profile.changePhoto')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-center py-4">
              <Avatar className="h-32 w-32 ring-2 ring-border">
                <AvatarFallback className="text-3xl">
                  {userName.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
            <p className="text-sm text-muted-foreground text-center">
              {t('profile.noAvatarMessage')}
            </p>
            <Button onClick={onChangePhoto} className="w-full">
              <Upload className="h-4 w-4 mr-2" />
              {t('profile.uploadPhoto')}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
