'use client';

import { useState } from 'react';
import { Heart, MessageCircle, Share2, MoreVertical } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { usePermissions, hasPermission } from '@/hooks/usePermissions';
import { Post } from '@/hooks/useInfiniteFeed';
import { MediaGallery } from './MediaGallery';
import { MentionsText } from './MentionsText';
import { toast } from 'sonner';

interface PostCardProps {
  post: Post;
  onLike?: (postId: string) => void;
  onComment?: (postId: string) => void;
  onShare?: (postId: string) => void;
}

export function PostCard({ post, onLike, onComment, onShare }: PostCardProps) {
  const { permissions } = usePermissions();
  const [isLiked, setIsLiked] = useState(post.is_liked_by_me);
  const [likesCount, setLikesCount] = useState(post.likes_count);
  const [isLiking, setIsLiking] = useState(false);

  const canLike = hasPermission(permissions, 'posts:like');
  const canComment = hasPermission(permissions, 'posts:comment');
  const canShare = hasPermission(permissions, 'posts:share');

  const handleLike = async () => {
    if (!canLike || isLiking) return;

    // Optimistic update
    const previousLiked = isLiked;
    const previousCount = likesCount;
    
    setIsLiked(!isLiked);
    setLikesCount(prev => isLiked ? prev - 1 : prev + 1);
    setIsLiking(true);

    try {
      await onLike?.(post.id);
    } catch (error) {
      // Rollback on error
      setIsLiked(previousLiked);
      setLikesCount(previousCount);
      toast.error('Errore durante il like');
    } finally {
      setIsLiking(false);
    }
  };

  return (
    <Card className="p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarImage src={post.author.avatar_url} />
            <AvatarFallback>
              {post.author.full_name.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{post.author.full_name}</p>
            <p className="text-sm text-muted-foreground">
              {formatDistanceToNow(new Date(post.created_at), { 
                addSuffix: true, 
                locale: it 
              })}
              {post.edited_at && ' • modificato'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {post.is_pinned && (
            <Badge variant="secondary" className="text-xs">
              Fissato
            </Badge>
          )}
          <Button variant="ghost" size="icon">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-2">
        <MentionsText content={post.content} mentions={post.mentions} />
        <MediaGallery media={post.media_urls || []} />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 pt-2 border-t">
        <Button
          variant="ghost"
          size="sm"
          className="gap-2"
          onClick={handleLike}
          disabled={!canLike || isLiking}
        >
          <Heart 
            className={`h-4 w-4 transition-colors ${
              isLiked ? 'fill-red-500 text-red-500' : ''
            }`}
          />
          <span className="text-sm">{likesCount}</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="gap-2"
          onClick={() => onComment?.(post.id)}
          disabled={!canComment}
        >
          <MessageCircle className="h-4 w-4" />
          <span className="text-sm">{post.comments_count}</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="gap-2"
          onClick={() => onShare?.(post.id)}
          disabled={!canShare}
        >
          <Share2 className="h-4 w-4" />
          {post.shares_count > 0 && (
            <span className="text-sm">{post.shares_count}</span>
          )}
        </Button>
      </div>
    </Card>
  );
}
