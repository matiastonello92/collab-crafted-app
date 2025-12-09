'use client';

import useSWR from 'swr';
import { createSupabaseBrowserClient } from '@/utils/supabase/client';
import { UserWidgetPreference } from '@/lib/dashboard/types';

const fetcher = async (): Promise<UserWidgetPreference[]> => {
  const supabase = createSupabaseBrowserClient();
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
    const supabase = createSupabaseBrowserClient();
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

  const updateWidgetPosition = async (
    widgetId: string, 
    x: number, 
    y: number, 
    w: number, 
    h: number
  ) => {
    const supabase = createSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Optimistic update
    mutate(
      (current) => {
        if (!current) return current;
        return current.map(pref => 
          pref.widget_id === widgetId 
            ? { ...pref, grid_x: x, grid_y: y, grid_w: w, grid_h: h }
            : pref
        );
      },
      false
    );

    const { error } = await supabase
      .from('user_dashboard_widgets')
      .upsert({
        user_id: user.id,
        widget_id: widgetId,
        grid_x: x,
        grid_y: y,
        grid_w: w,
        grid_h: h,
      });

    if (error) {
      mutate(); // Revert on error
    }
  };

  return {
    preferences: data || [],
    isLoading,
    error,
    updateWidget,
    updateWidgetPosition,
    mutate,
  };
}
