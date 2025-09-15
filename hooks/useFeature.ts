'use client';

import { useState, useEffect } from 'react';

interface UseFeatureProps {
  initial: boolean;
  orgId: string;
  key: string;
}

export function useFeature({ initial, orgId, key }: UseFeatureProps) {
  const [enabled, setEnabled] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/features/check?key=${encodeURIComponent(key)}&org=${encodeURIComponent(orgId)}`);
      if (!response.ok) {
        throw new Error('Failed to check feature');
      }
      
      const { enabled: isEnabled } = await response.json();
      setEnabled(!!isEnabled);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      // Keep initial value on error
    } finally {
      setLoading(false);
    }
  };

  return {
    enabled,
    loading,
    error,
    refresh
  };
}
