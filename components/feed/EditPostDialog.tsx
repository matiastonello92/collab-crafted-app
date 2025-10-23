'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MentionInput } from './MentionInput';
import { MediaPreview } from './MediaPreview';
import { useMediaUpload } from '@/hooks/useMediaUpload';
import { toast } from 'sonner';

interface EditPostDialogProps {
  postId: string;
  initialContent: string;
  initialMedia: Array<{ type: 'image' | 'video'; url: string }>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  locationId?: string;
}

export function EditPostDialog({
  postId,
  initialContent,
  initialMedia,
  open,
  onOpenChange,
  onSuccess,
  locationId,
}: EditPostDialogProps) {
  const [content, setContent] = useState(initialContent);
  const [media, setMedia] = useState(initialMedia);
  const [mentionedUserIds, setMentionedUserIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { uploadFile, isUploading, progress } = useMediaUpload(locationId);

  useEffect(() => {
    if (open) {
      setContent(initialContent);
      setMedia(initialMedia);
    }
  }, [open, initialContent, initialMedia]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const uploaded = await uploadFile(file);
      setMedia(prev => [...prev, { type: uploaded.type, url: uploaded.url }]);
      toast.success('Media aggiunto');
    } catch (error) {
      toast.error('Errore nel caricamento del media');
    }
  };

  const handleRemoveMedia = (index: number) => {
    setMedia(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!content.trim() && media.length === 0) {
      toast.error('Aggiungi del contenuto o un media');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/v1/posts/${postId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: content.trim(),
          media_urls: media,
          mentioned_user_ids: mentionedUserIds,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update post');
      }

      toast.success('Post aggiornato con successo!');
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast.error('Errore nell\'aggiornamento del post');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMentionSelect = (userId: string) => {
    if (!mentionedUserIds.includes(userId)) {
      setMentionedUserIds(prev => [...prev, userId]);
    }
  };

  const MAX_CONTENT_LENGTH = 5000;
  const characterCount = content.length;
  const isOverLimit = characterCount > MAX_CONTENT_LENGTH;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Modifica Post</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <MentionInput
            value={content}
            onChange={setContent}
            onMentionSelect={handleMentionSelect}
            placeholder="Cosa vuoi condividere?"
            locationId={locationId}
            maxLength={MAX_CONTENT_LENGTH}
            className="min-h-[120px] text-base"
          />

          <MediaPreview media={media} onRemove={handleRemoveMedia} />

          <div className="flex items-center gap-3">
            <label className="flex-1">
              <input
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={handleFileSelect}
                disabled={isUploading || isSubmitting}
                multiple
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                asChild
                disabled={isUploading || isSubmitting}
                className="w-full"
              >
                <span className="cursor-pointer">
                  {isUploading ? `Caricamento ${progress}%` : 'Aggiungi Media'}
                </span>
              </Button>
            </label>

            <span
              className={`text-sm font-medium whitespace-nowrap ${
                isOverLimit ? 'text-destructive' : 'text-muted-foreground'
              }`}
            >
              {characterCount} / {MAX_CONTENT_LENGTH}
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Annulla
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || isUploading || isOverLimit || (!content.trim() && media.length === 0)}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvataggio...
              </>
            ) : (
              'Salva Modifiche'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
