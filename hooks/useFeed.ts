'use client';

import useSWR from 'swr';
import { createSupabaseBrowserClient } from '@/utils/supabase/client';
import { usePermissions, hasPermission } from '@/hooks/usePermissions';

export interface Post {
  id: string;
  content: string;
  media_urls: Array<{ type: 'image' | 'video'; url: string; thumbnail?: string }>;
  visibility: 'location' | 'organization';
  likes_count: number;
  comments_count: number;
  shares_count: number;
  is_pinned: boolean;
  is_liked_by_me: boolean;
  created_at: string;
  edited_at?: string;
  author: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
  mentions?: Array<{
    id: string;
    mentioned_user?: { id: string; full_name: string };
    mentioned_org?: { org_id: string; name: string };
  }>;
}

interface FeedResponse {
  posts: Post[];
  nextCursor?: string | null;
}

interface UseFeedOptions {
  locationId?: string;
  limit?: number;
  filter?: 'all' | 'pinned' | 'archived';
  authorId?: string;
}

const fetcher = async (url: string): Promise<FeedResponse> => {
  const supabase = createSupabaseBrowserClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch feed');
  }

  return response.json();
};

export function useFeed(options: UseFeedOptions = {}) {
  const { locationId, limit = 20, filter = 'all', authorId } = options;
  const { permissions } = usePermissions(locationId);
  
  const canView = hasPermission(permissions, 'posts:view');

  const params = new URLSearchParams();
  if (locationId) params.set('locationId', locationId);
  if (limit) params.set('limit', limit.toString());
  if (filter) params.set('filter', filter);
  if (authorId) params.set('authorId', authorId);

  const key = `/api/v1/posts?${params.toString()}`;

  const { data, error, isLoading, mutate } = useSWR<FeedResponse>(
    canView ? key : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000, // 30s
    }
  );

  const addPost = async (newPost: Post) => {
    // Optimistic update
    mutate(
      (current) => ({
        posts: [newPost, ...(current?.posts || [])],
        nextCursor: current?.nextCursor,
      }),
      false
    );
  };

  const likePost = async (postId: string) => {
    // Optimistic update
    mutate(
      (current) => {
        if (!current) return current;
        return {
          ...current,
          posts: current.posts.map((p) =>
            p.id === postId
              ? {
                  ...p,
                  is_liked_by_me: !p.is_liked_by_me,
                  likes_count: p.likes_count + (p.is_liked_by_me ? -1 : 1),
                }
              : p
          ),
        };
      },
      false
    );

    try {
      const supabase = createSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      await fetch(`/api/v1/posts/${postId}/like`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      // Revalidate
      mutate();
    } catch (err) {
      console.error('Failed to like post:', err);
      // Revert optimistic update
      mutate();
    }
  };

  const deletePost = async (postId: string) => {
    // Optimistic update
    mutate(
      (current) => {
        if (!current) return current;
        return {
          ...current,
          posts: current.posts.filter((p) => p.id !== postId),
        };
      },
      false
    );

    try {
      const supabase = createSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      await fetch(`/api/v1/posts/${postId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      mutate();
    } catch (err) {
      console.error('Failed to delete post:', err);
      mutate();
    }
  };

  return {
    posts: data?.posts,
    nextCursor: data?.nextCursor,
    isLoading,
    error,
    addPost,
    likePost,
    deletePost,
    mutate,
  };
}
