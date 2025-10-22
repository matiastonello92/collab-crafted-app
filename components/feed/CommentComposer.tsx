'use client';

import { useState } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useComments } from '@/hooks/useComments';
import { toast } from 'sonner';

interface CommentComposerProps {
  postId: string;
  locationId?: string;
  parentCommentId?: string;
  placeholder?: string;
  onCommentAdded?: () => void;
}

export function CommentComposer({
  postId,
  locationId,
  parentCommentId,
  placeholder = 'Aggiungi un commento...',
  onCommentAdded,
}: CommentComposerProps) {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { addComment, canComment } = useComments(postId, locationId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim()) {
      toast.error('Il commento non può essere vuoto');
      return;
    }

    setIsSubmitting(true);

    try {
      await addComment(content.trim(), parentCommentId);
      setContent('');
      toast.success('Commento pubblicato');
      onCommentAdded?.();
    } catch (error) {
      toast.error('Errore nella pubblicazione del commento');
    } finally {
      setIsSubmitting(false);
    }
  };

  const maxLength = 2000;
  const characterCount = content.length;
  const isOverLimit = characterCount > maxLength;

  if (!canComment) {
    return (
      <div className="text-center py-3">
        <p className="text-sm text-muted-foreground">
          Non hai i permessi per commentare
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={placeholder}
        className="resize-none min-h-[80px]"
        maxLength={maxLength}
        disabled={isSubmitting}
      />

      <div className="flex items-center justify-between">
        <span
          className={`text-xs ${
            isOverLimit ? 'text-destructive' : 'text-muted-foreground'
          }`}
        >
          {characterCount} / {maxLength}
        </span>

        <Button
          type="submit"
          size="sm"
          disabled={isSubmitting || !content.trim() || isOverLimit}
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
    </form>
  );
}
