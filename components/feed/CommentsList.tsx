'use client';

import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { MessageCircle, Trash2 } from 'lucide-react';
import { useComments } from '@/hooks/useComments';
import { usePermissions, hasPermission } from '@/hooks/usePermissions';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

interface CommentsListProps {
  postId: string;
  locationId?: string;
  currentUserId?: string;
}

export function CommentsList({ postId, locationId, currentUserId }: CommentsListProps) {
  const { comments, isLoading, deleteComment } = useComments(postId, locationId);
  const { permissions } = usePermissions(locationId);
  const canDelete = hasPermission(permissions, 'posts:delete');

  const handleDelete = async (commentId: string) => {
    try {
      await deleteComment(commentId);
      toast.success('Commento eliminato');
    } catch (error) {
      toast.error('Errore nell\'eliminazione del commento');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!comments || comments.length === 0) {
    return (
      <div className="text-center py-6">
        <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground/30 mb-2" />
        <p className="text-sm text-muted-foreground">Nessun commento ancora</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {comments.map((comment) => (
        <div key={comment.id} className="flex gap-3 group">
          <Avatar className="h-8 w-8">
            <AvatarImage src={comment.author?.avatar_url} />
            <AvatarFallback>
              {comment.author?.full_name.split(' ').map(n => n[0]).join('') || '?'}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 space-y-1">
            <div className="flex items-baseline gap-2">
              <span className="font-medium text-sm">{comment.author?.full_name}</span>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(comment.created_at), {
                  addSuffix: true,
                  locale: it,
                })}
              </span>
            </div>

            <p className="text-sm whitespace-pre-wrap">{comment.content}</p>

            {comment.likes_count > 0 && (
              <p className="text-xs text-muted-foreground">
                {comment.likes_count} {comment.likes_count === 1 ? 'like' : 'likes'}
              </p>
            )}
          </div>

          {canDelete && currentUserId === comment.author?.id && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => handleDelete(comment.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
