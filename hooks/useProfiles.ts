'use client';

import useSWR from 'swr';
import { createSupabaseBrowserClient } from '@/utils/supabase/client';

const supabase = createSupabaseBrowserClient();

const fetcher = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) throw error;
  return data;
};

export function useProfiles() {
  const { data, error, isLoading, mutate } = useSWR('profile', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  });

  return {
    profile: data,
    isLoading,
    error,
    mutate,
  };
}
