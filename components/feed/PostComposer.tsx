'use client';

import { useState } from 'react';
import { ImagePlus, Loader2, Send } from 'lucide-react';
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

  const characterCount = content.length;
  const maxCharacters = 5000;
  const isOverLimit = characterCount > maxCharacters;

  return (
    <Card className="p-4">
      <div className="flex gap-3">
        {userProfile && (
          <Avatar>
            <AvatarImage src={userProfile.avatar_url} />
            <AvatarFallback>
              {userProfile.full_name.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
        )}

        <div className="flex-1 space-y-3">
          <MentionInput
            value={content}
            onChange={setContent}
            onMentionSelect={handleMentionSelect}
            placeholder="Cosa vuoi condividere?"
            locationId={locationId}
            maxLength={maxCharacters}
            className="min-h-[100px]"
          />

          <MediaPreview media={media} onRemove={handleRemoveMedia} />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
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
                  variant="ghost"
                  size="sm"
                  asChild
                  disabled={isUploading || isSubmitting}
                >
                  <span className="cursor-pointer">
                    {isUploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ImagePlus className="h-4 w-4" />
                    )}
                  </span>
                </Button>
              </label>

              {isUploading && (
                <span className="text-xs text-muted-foreground">
                  {progress}%
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <span
                className={`text-xs ${
                  isOverLimit ? 'text-destructive' : 'text-muted-foreground'
                }`}
              >
                {characterCount} / {maxCharacters}
              </span>

              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || isUploading || isOverLimit || (!content.trim() && media.length === 0)}
                size="sm"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Pubblica
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
