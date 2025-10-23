'use client';

import { useState } from 'react';
import { usePermissions, hasPermission } from '@/hooks/usePermissions';

export interface UploadedMedia {
  url: string;
  type: 'image' | 'video';
  path: string;
}

export function useMediaUpload(locationId?: string) {
  const { permissions } = usePermissions(locationId);
  const canUpload = hasPermission(permissions, 'posts:create');

  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const uploadFile = async (file: File): Promise<UploadedMedia> => {
    if (!canUpload) {
      throw new Error('No permission to upload media');
    }

    setIsUploading(true);
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/v1/posts/upload-media', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const data = await response.json();
      setProgress(100);

      return data;
    } finally {
      setIsUploading(false);
      setTimeout(() => setProgress(0), 1000);
    }
  };

  const uploadMultipleFiles = async (files: File[]): Promise<UploadedMedia[]> => {
    if (!canUpload) {
      throw new Error('No permission to upload media');
    }

    if (files.length === 0) return [];

    setIsUploading(true);
    setProgress(0);

    try {
      const results: UploadedMedia[] = [];
      let completed = 0;

      for (const file of files) {
        try {
          const formData = new FormData();
          formData.append('file', file);

          const response = await fetch('/api/v1/posts/upload-media', {
            method: 'POST',
            credentials: 'include',
            body: formData,
          });

          if (!response.ok) {
            console.error(`Failed to upload ${file.name}`);
            continue;
          }

          const data = await response.json();
          results.push(data);
        } catch (error) {
          console.error(`Error uploading ${file.name}:`, error);
        }

        completed++;
        setProgress(Math.round((completed / files.length) * 100));
      }

      return results;
    } finally {
      setIsUploading(false);
      setTimeout(() => setProgress(0), 1000);
    }
  };

  return {
    uploadFile,
    uploadMultipleFiles,
    isUploading,
    progress,
    canUpload,
  };
}
