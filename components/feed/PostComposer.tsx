'use client';

import { useState } from 'react';
import { Image as ImageIcon, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MentionInput } from './MentionInput';
import { MediaPreview } from './MediaPreview';
import { useMediaUpload } from '@/hooks/useMediaUpload';
import { useFeed } from '@/hooks/useFeed';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { toast } from 'sonner';

interface PostComposerProps {
  locationId?: string;
  userProfile?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
  onPostCreated?: () => void;
}

export function PostComposer({ locationId, userProfile, onPostCreated }: PostComposerProps) {
  const [content, setContent] = useState('');
  const [mentionedUserIds, setMentionedUserIds] = useState<string[]>([]);
  const [media, setMedia] = useState<Array<{ type: 'image' | 'video'; url: string }>>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { uploadFile, isUploading, progress } = useMediaUpload(locationId);
  const { isMobile } = useBreakpoint();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Limit to 10 media total
    const remainingSlots = 10 - media.length;
    const filesToUpload = files.slice(0, remainingSlots);

    if (files.length > remainingSlots) {
      toast.error(`Puoi aggiungere massimo 10 media. ${files.length - remainingSlots} file ignorati.`);
    }

    try {
      const uploadPromises = filesToUpload.map(file => uploadFile(file));
      const uploaded = await Promise.all(uploadPromises);
      
      setMedia(prev => [...prev, ...uploaded.map(u => ({ type: u.type, url: u.url }))]);
      toast.success(`${uploaded.length} media caricati con successo`);
    } catch (error) {
      toast.error('Errore nel caricamento dei media');
    }

    // Reset input
    e.target.value = '';
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
      // Create post via API
      const response = await fetch('/api/v1/posts', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: content.trim(),
          location_id: locationId,
          visibility: locationId ? 'location' : 'organization',
          media_urls: media,
          mentioned_user_ids: mentionedUserIds,
          mentioned_org_ids: [],
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create post');
      }

      // Reset form
      setContent('');
      setMedia([]);
      setMentionedUserIds([]);
      
      toast.success('Post pubblicato con successo!');
      onPostCreated?.();
    } catch (error) {
      toast.error('Errore nella pubblicazione del post');
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
    <Card className="p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex flex-col sm:flex-row gap-4">
        <Avatar className="h-12 w-12 sm:h-12 sm:w-12">
          <AvatarImage src={userProfile?.avatar_url} />
          <AvatarFallback>
            {userProfile?.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 space-y-4">
          <MentionInput
            value={content}
            onChange={setContent}
            onMentionSelect={handleMentionSelect}
            placeholder="Cosa vuoi condividere?"
            locationId={locationId}
            maxLength={MAX_CONTENT_LENGTH}
            className="min-h-[80px] sm:min-h-[120px] text-base"
          />

          <MediaPreview media={media} onRemove={handleRemoveMedia} />

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-0 pt-3 border-t">
            <label className="w-full sm:w-auto">
              <input
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={handleFileSelect}
                disabled={isUploading || isSubmitting || media.length >= 10}
                multiple
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                asChild
                disabled={isUploading || isSubmitting || media.length >= 10}
                className="w-full sm:w-auto gap-2 min-h-[44px] hover:bg-primary/10 hover:text-primary hover:border-primary transition-colors"
              >
                <span className="cursor-pointer flex items-center justify-center gap-2">
                  {isUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="font-medium">{progress}%</span>
                    </>
                  ) : (
                    <>
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <ImageIcon className="h-4 w-4" />
                      </div>
                      <span className="font-medium">
                        {isMobile ? 'Media' : 'Aggiungi Media'}
                      </span>
                    </>
                  )}
                </span>
              </Button>
            </label>

            <div className="flex items-center justify-between sm:justify-end gap-4">
              <span
                className={`text-sm font-medium ${
                  isOverLimit ? 'text-destructive' : 'text-muted-foreground'
                }`}
              >
                {characterCount} / {MAX_CONTENT_LENGTH}
              </span>

              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || isUploading || isOverLimit || (!content.trim() && media.length === 0)}
                size="default"
                className="min-w-[120px] min-h-[44px]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Pubblicazione...
                  </>
                ) : (
                  'Pubblica'
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
