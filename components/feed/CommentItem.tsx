'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';
import { Heart, Trash2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import type { Comment } from '@/hooks/useComments';

interface CommentItemProps {
  comment: Comment;
  currentUserId?: string;
  canDelete: boolean;
  onDelete: (commentId: string) => void;
}

export function CommentItem({ comment, currentUserId, canDelete, onDelete }: CommentItemProps) {
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(comment.likes_count);
  const isAuthor = currentUserId === comment.author.id;

  const handleLike = () => {
    setIsLiked(!isLiked);
    setLikesCount(prev => isLiked ? prev - 1 : prev + 1);
  };

  return (
    <div className="flex gap-3 py-3">
      <Avatar className="h-8 w-8">
        <AvatarImage src={comment.author.avatar_url} />
        <AvatarFallback>
          {comment.author.full_name.split(' ').map(n => n[0]).join('')}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{comment.author.full_name}</span>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(comment.created_at), { 
              addSuffix: true, 
              locale: it 
            })}
          </span>
        </div>

        <p className="text-sm">{comment.content}</p>

        <div className="flex items-center gap-2 pt-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 gap-1"
            onClick={handleLike}
          >
            <Heart 
              className={`h-3 w-3 transition-colors ${
                isLiked ? 'fill-red-500 text-red-500' : ''
              }`}
            />
            {likesCount > 0 && (
              <span className="text-xs">{likesCount}</span>
            )}
          </Button>

          {canDelete && isAuthor && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 gap-1 text-destructive"
              onClick={() => onDelete(comment.id)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
