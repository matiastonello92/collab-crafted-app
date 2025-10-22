'use client';

import useSWR from 'swr';
import { usePermissions, hasPermission } from '@/hooks/usePermissions';

export interface Comment {
  id: string;
  content: string;
  parent_comment_id?: string;
  likes_count: number;
  is_edited: boolean;
  created_at: string;
  edited_at?: string;
  author: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
}

interface CommentsResponse {
  comments: Comment[];
}

const fetcher = async (url: string): Promise<CommentsResponse> => {
  const response = await fetch(url, {
    credentials: 'include',
  });

  if (!response.ok) throw new Error('Failed to fetch comments');

  return response.json();
};

export function useComments(postId: string, locationId?: string) {
  const { permissions } = usePermissions(locationId);
  const canView = hasPermission(permissions, 'posts:view');
  const canComment = hasPermission(permissions, 'posts:comment');

  const key = `/api/v1/posts/${postId}/comments`;

  const { data, error, isLoading, mutate } = useSWR<CommentsResponse>(
    canView ? key : null,
    fetcher,
    {
      revalidateOnFocus: false,
    }
  );

  const addComment = async (content: string, parentCommentId?: string) => {
    if (!canComment) {
      throw new Error('No permission to comment');
    }

    const response = await fetch(key, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content,
        parent_comment_id: parentCommentId,
      }),
    });

    if (!response.ok) throw new Error('Failed to add comment');

    const { comment } = await response.json();

    // Optimistic update
    mutate((current) => ({
      comments: [...(current?.comments || []), comment],
    }), false);

    // Revalidate
    mutate();

    return comment;
  };

  const deleteComment = async (commentId: string) => {
    // Optimistic update
    mutate((current) => ({
      comments: (current?.comments || []).filter((c) => c.id !== commentId),
    }), false);

    try {
      await fetch(`/api/v1/posts/comments/${commentId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      mutate();
    } catch (err) {
      console.error('Failed to delete comment:', err);
      mutate(); // Revert
    }
  };

  return {
    comments: data?.comments,
    isLoading,
    error,
    canComment,
    addComment,
    deleteComment,
    mutate,
  };
}
