'use client';

import { useState, useEffect } from 'react';
import { useSupabase } from '@/hooks/useSupabase';

interface PresenceUser {
  user_id: string;
  full_name?: string;
}

export function useInventoryRealtime(headerId?: string) {
  const [presenceUsers, setPresenceUsers] = useState<PresenceUser[]>([]);
  const supabase = useSupabase();

  const updatePresence = async (headerIdToUpdate: string) => {
    if (!headerIdToUpdate) return;
    
    try {
      await supabase
        .from('inventory_presence')
        .upsert({
          header_id: headerIdToUpdate,
          user_id: (await supabase.auth.getUser()).data.user?.id,
          last_seen_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error updating presence:', error);
    }
  };

  useEffect(() => {
    if (!headerId) return;

    // Subscribe to realtime presence updates
    const channel = supabase
      .channel(`inventory_${headerId}`)
      .on('presence', { event: 'sync' }, () => {
        // Handle presence sync
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [headerId]);

  return { presenceUsers, updatePresence };
}