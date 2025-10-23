'use client';

import { useEffect, useState } from 'react';
import { useInView } from 'react-intersection-observer';
import { useInfiniteFeed } from '@/hooks/useInfiniteFeed';
import { usePostsRealtime } from '@/hooks/usePostsRealtime';
import { hasPermission } from '@/hooks/usePermissions';
import { PostCard } from './PostCard';
import { FeedSkeleton } from './FeedSkeleton';
import { EmptyFeedState } from './EmptyFeedState';
import { useFeed } from '@/hooks/useFeed';
import { usePermissions } from '@/hooks/usePermissions';
import { createSupabaseBrowserClient } from '@/utils/supabase/client';
import { toast } from 'sonner';

interface FeedContainerProps {
  locationId?: string;
  filter?: 'all' | 'pinned' | 'archived';
  authorId?: string;
  mutateRef?: React.MutableRefObject<(() => void) | null>;
}

export function FeedContainer({ locationId, filter = 'all', authorId, mutateRef }: FeedContainerProps) {
  const { permissions } = usePermissions(locationId);
  const canCreate = hasPermission(permissions, 'posts:create');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  const {
    posts,
    isLoading,
    isLoadingMore,
    isEmpty,
    isReachingEnd,
    error,
    loadMore,
    mutate,
    canView,
  } = useInfiniteFeed({ locationId, filter, authorId, limit: 20 });

  const { likePost, sharePost } = useFeed({ locationId });

  // Expose mutate function through ref
  useEffect(() => {
    if (mutateRef) {
      mutateRef.current = mutate;
    }
  }, [mutate, mutateRef]);

  // Get current user ID
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id || null);
    });
  }, []);

  // Infinite scroll trigger
  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0,
    rootMargin: '100px',
  });

  // Load more when scrolling near bottom
  useEffect(() => {
    if (inView && !isLoadingMore && !isReachingEnd) {
      loadMore();
    }
  }, [inView, isLoadingMore, isReachingEnd, loadMore]);

  // Realtime updates
  usePostsRealtime({
    locationId,
    onPostInsert: (newPost) => {
      // Refresh feed to show new post
      mutate();
    },
    onPostUpdate: (updatedPost) => {
      // Update post in cache
      mutate();
    },
    onPostDelete: (postId) => {
      // Remove post from cache
      mutate();
    },
  });

  if (!canView) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Non hai i permessi per visualizzare questo feed.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">Errore nel caricamento del feed.</p>
      </div>
    );
  }

  if (isLoading) {
    return <FeedSkeleton count={3} />;
  }

  if (isEmpty) {
    return <EmptyFeedState canCreate={canCreate} />;
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          currentUserId={currentUserId}
          onLike={likePost}
          onShare={async (postId) => {
            try {
              await sharePost(postId);
              toast.success('Post condiviso con successo');
              mutate();
            } catch (error) {
              toast.error('Errore nella condivisione del post');
            }
          }}
        />
      ))}

      {/* Infinite scroll trigger */}
      {!isReachingEnd && (
        <div ref={loadMoreRef} className="py-4">
          {isLoadingMore && <FeedSkeleton count={1} />}
        </div>
      )}

      {/* End of feed message */}
      {isReachingEnd && posts.length > 0 && (
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground">Hai visto tutto 🎉</p>
        </div>
      )}
    </div>
  );
}
