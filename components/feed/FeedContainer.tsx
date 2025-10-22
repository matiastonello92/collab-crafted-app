'use client';

import { useEffect, useRef } from 'react';
import { useInView } from 'react-intersection-observer';
import { useInfiniteFeed } from '@/hooks/useInfiniteFeed';
import { usePostsRealtime } from '@/hooks/usePostsRealtime';
import { hasPermission } from '@/hooks/usePermissions';
import { PostCard } from './PostCard';
import { FeedSkeleton } from './FeedSkeleton';
import { EmptyFeedState } from './EmptyFeedState';
import { useFeed } from '@/hooks/useFeed';
import { usePermissions } from '@/hooks/usePermissions';

interface FeedContainerProps {
  locationId?: string;
  filter?: 'all' | 'pinned' | 'archived';
  authorId?: string;
}

export function FeedContainer({ locationId, filter = 'all', authorId }: FeedContainerProps) {
  const { permissions } = usePermissions(locationId);
  const canCreate = hasPermission(permissions, 'posts:create');
  
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

  const { likePost } = useFeed({ locationId });

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
          onLike={likePost}
          onComment={(postId) => {
            // Navigate to post detail or open comments modal
            console.log('Comment on post:', postId);
          }}
          onShare={(postId) => {
            // Open share dialog
            console.log('Share post:', postId);
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
