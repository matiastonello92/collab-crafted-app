'use client';

import { useState } from 'react';
import { Heart, MessageCircle, Share2, Repeat2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';
import { motion } from 'motion/react';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { usePermissions, hasPermission } from '@/hooks/usePermissions';
import { Post } from '@/hooks/useInfiniteFeed';
import { MediaGallery } from './MediaGallery';
import { MentionsText } from './MentionsText';
import { ReportPostDialog } from './ReportPostDialog';
import { PostOptionsMenu } from './PostOptionsMenu';
import { CommentSection } from './CommentSection';
import { EditPostDialog } from './EditPostDialog';
import { usePostAnalytics } from '@/hooks/usePostAnalytics';
import { toast } from 'sonner';

interface PostCardProps {
  post: Post;
  currentUserId?: string | null;
  onLike?: (postId: string) => void;
  onShare?: (postId: string) => void;
}

const MAX_CONTENT_LENGTH = 300;

export function PostCard({ post, currentUserId, onLike, onShare }: PostCardProps) {
  const { permissions } = usePermissions();
  const [isLiked, setIsLiked] = useState(post.is_liked_by_me);
  const [likesCount, setLikesCount] = useState(post.likes_count);
  const [isLiking, setIsLiking] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [sharesCount, setSharesCount] = useState(post.shares_count);
  const { ref } = usePostAnalytics(post.id, true);

  const canLike = hasPermission(permissions, 'posts:like');
  const canComment = hasPermission(permissions, 'posts:comment');
  const canShare = hasPermission(permissions, 'posts:share');
  const isAuthor = currentUserId === post.author.id;

  const shouldTruncate = post.content.length > MAX_CONTENT_LENGTH;
  const displayContent = shouldTruncate && !isExpanded
    ? post.content.substring(0, MAX_CONTENT_LENGTH) + '...'
    : post.content;

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

  const handleDelete = async () => {
    if (!confirm('Sei sicuro di voler eliminare questo post?')) return;

    try {
      const response = await fetch(`/api/v1/posts/${post.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete post');
      }

      toast.success('Post eliminato');
      // Trigger page refresh or parent component refresh
      window.location.reload();
    } catch (error) {
      toast.error('Errore durante l\'eliminazione');
    }
  };

  const handleEdit = () => {
    setEditDialogOpen(true);
  };

  const handleRepost = async () => {
    const previousCount = sharesCount;
    setSharesCount(prev => prev + 1);

    try {
      await onShare?.(post.id);
      toast.success('Post ricondiviso');
    } catch (error) {
      setSharesCount(previousCount);
      toast.error('Errore durante la ricondivisione');
    }
  };

  return (
    <>
      <Card ref={ref} className="p-6 space-y-4 shadow-sm hover:shadow-md transition-shadow">
        {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12">
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
          <PostOptionsMenu
            postId={post.id}
            isAuthor={isAuthor}
            isAdmin={hasPermission(permissions, 'posts:moderate')}
            isPinned={post.is_pinned}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onReport={() => setReportDialogOpen(true)}
          />
        </div>
      </div>

      {/* Content */}
      <div className="space-y-2">
        <MentionsText content={displayContent} mentions={post.mentions} />
        
        {shouldTruncate && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-primary hover:underline p-0 h-auto font-medium"
          >
            {isExpanded ? 'Mostra meno' : 'Leggi tutto'}
          </Button>
        )}
        
        <MediaGallery media={post.media_urls || []} />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 pt-2 border-t">
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 hover:bg-red-500/10 hover:text-red-500 transition-colors"
          onClick={handleLike}
          disabled={!canLike || isLiking}
        >
          <motion.div
            whileTap={{ scale: 1.2 }}
            animate={isLiked ? { scale: [1, 1.3, 1] } : {}}
            transition={{ duration: 0.3 }}
          >
            <Heart 
              className={`h-4 w-4 transition-colors ${
                isLiked ? 'fill-red-500 text-red-500' : ''
              }`}
            />
          </motion.div>
          <span className="text-sm font-medium">{likesCount}</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="gap-2 hover:bg-primary/10 hover:text-primary transition-colors"
          onClick={() => setShowComments(!showComments)}
          disabled={!canComment}
        >
          <MessageCircle className="h-4 w-4" />
          <span className="text-sm font-medium">{post.comments_count}</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="gap-2 hover:bg-primary/10 hover:text-primary transition-colors"
          onClick={() => onShare?.(post.id)}
          disabled={!canShare}
        >
          <Share2 className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="gap-2 hover:bg-green-500/10 hover:text-green-600 transition-colors"
          onClick={handleRepost}
          disabled={!canShare}
        >
          <Repeat2 className="h-4 w-4" />
          {sharesCount > 0 && (
            <span className="text-sm font-medium">{sharesCount}</span>
          )}
        </Button>
      </div>

      {/* Comments Section */}
      {showComments && (
        <CommentSection 
          postId={post.id}
          currentUserId={currentUserId || undefined}
        />
      )}
    </Card>

    <ReportPostDialog
      postId={post.id}
      open={reportDialogOpen}
      onOpenChange={setReportDialogOpen}
    />

    <EditPostDialog
      postId={post.id}
      initialContent={post.content}
      initialMedia={post.media_urls || []}
      open={editDialogOpen}
      onOpenChange={setEditDialogOpen}
      onSuccess={() => window.location.reload()}
    />
    </>
  );
}
