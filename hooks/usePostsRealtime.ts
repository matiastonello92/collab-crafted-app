'use client';

import { useEffect, useCallback } from 'react';
import { useSupabase } from '@/hooks/useSupabase';
import { Post } from '@/hooks/useInfiniteFeed';

interface UsePostsRealtimeOptions {
  onPostInsert?: (post: Post) => void;
  onPostUpdate?: (post: Post) => void;
  onPostDelete?: (postId: string) => void;
  locationId?: string;
}

export function usePostsRealtime({
  onPostInsert,
  onPostUpdate,
  onPostDelete,
  locationId,
}: UsePostsRealtimeOptions) {
  const supabase = useSupabase();

  useEffect(() => {
    // Subscribe to posts changes
    const postsChannel = supabase
      .channel(`posts_${locationId || 'all'}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'posts',
          filter: locationId ? `location_id=eq.${locationId}` : undefined,
        },
        (payload) => {
          if (onPostInsert && payload.new) {
            onPostInsert(payload.new as Post);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'posts',
          filter: locationId ? `location_id=eq.${locationId}` : undefined,
        },
        (payload) => {
          if (onPostUpdate && payload.new) {
            onPostUpdate(payload.new as Post);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'posts',
          filter: locationId ? `location_id=eq.${locationId}` : undefined,
        },
        (payload) => {
          if (onPostDelete && payload.old) {
            onPostDelete((payload.old as Post).id);
          }
        }
      )
      .subscribe();

    // Subscribe to likes changes for real-time counter updates
    const likesChannel = supabase
      .channel('post_likes_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'post_likes',
        },
        () => {
          // Trigger post update to refresh counts
        }
      )
      .subscribe();

    // Subscribe to comments changes for real-time counter updates
    const commentsChannel = supabase
      .channel('post_comments_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'post_comments',
        },
        () => {
          // Trigger post update to refresh counts
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(postsChannel);
      supabase.removeChannel(likesChannel);
      supabase.removeChannel(commentsChannel);
    };
  }, [supabase, locationId, onPostInsert, onPostUpdate, onPostDelete]);
}
