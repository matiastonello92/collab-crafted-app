'use client';

import useSWR from 'swr';
import { createSupabaseBrowserClient } from '@/utils/supabase/client';
import { UserWidgetPreference } from '@/lib/dashboard/types';

const supabase = createSupabaseBrowserClient();

const fetcher = async (): Promise<UserWidgetPreference[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('user_dashboard_widgets')
    .select('*')
    .eq('user_id', user.id)
    .order('position');

  if (error) throw error;
  return data || [];
};

export function useDashboardWidgets() {
  const { data, error, isLoading, mutate } = useSWR<UserWidgetPreference[]>(
    'dashboard-widgets',
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // 1 min cache
    }
  );

  const updateWidget = async (widgetId: string, updates: Partial<UserWidgetPreference>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('user_dashboard_widgets')
      .upsert({
        user_id: user.id,
        widget_id: widgetId,
        ...updates,
      });

    if (!error) {
      mutate();
    }
  };

  return {
    preferences: data || [],
    isLoading,
    error,
    updateWidget,
    mutate,
  };
}
