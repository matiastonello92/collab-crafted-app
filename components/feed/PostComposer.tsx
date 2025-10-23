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
  const { addPost } = useFeed({ locationId });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const uploaded = await uploadFile(file);
      setMedia(prev => [...prev, { type: uploaded.type, url: uploaded.url }]);
      toast.success('Media caricato con successo');
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

      const { post } = await response.json();

      // Optimistically add to feed
      addPost(post);

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
    <Card className="p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex gap-4">
        <Avatar className="h-12 w-12">
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
            className="min-h-[120px] text-base"
          />

          <MediaPreview media={media} onRemove={handleRemoveMedia} />

          <div className="flex items-center justify-between pt-3 border-t">
            <label>
              <input
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={handleFileSelect}
                disabled={isUploading || isSubmitting}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                asChild
                disabled={isUploading || isSubmitting}
                className="gap-2 hover:bg-primary/10 hover:text-primary hover:border-primary transition-colors"
              >
                <span className="cursor-pointer flex items-center gap-2">
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
                      <span className="font-medium">Aggiungi Media</span>
                    </>
                  )}
                </span>
              </Button>
            </label>

            <div className="flex items-center gap-4">
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
                className="min-w-[120px]"
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
