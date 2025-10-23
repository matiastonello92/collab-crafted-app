'use client';

import { Loader2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useComments } from '@/hooks/useComments';
import { CommentComposer } from './CommentComposer';
import { CommentItem } from './CommentItem';

interface CommentSectionProps {
  postId: string;
  locationId?: string;
  currentUserId?: string;
}

export function CommentSection({ postId, locationId, currentUserId }: CommentSectionProps) {
  const { comments, isLoading, canComment, deleteComment } = useComments(postId, locationId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Separator />
      
      {canComment && (
        <CommentComposer 
          postId={postId} 
          locationId={locationId}
          placeholder="Aggiungi un commento..."
        />
      )}

      {comments && comments.length > 0 && (
        <div className="space-y-1">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              currentUserId={currentUserId}
              canDelete={canComment}
              onDelete={deleteComment}
            />
          ))}
        </div>
      )}
    </div>
  );
}
