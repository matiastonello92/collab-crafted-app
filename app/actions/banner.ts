'use server'

import { createSupabaseUserClient } from '@/lib/supabase/clients'
import { requireOrgAdmin } from '@/lib/admin/guards'
import { revalidatePath } from 'next/cache'

export async function saveBanner(message: string, enabled: boolean) {
  await requireOrgAdmin()
  
  const supabase = await createSupabaseUserClient()
  
  // Save to app_settings
  const { error: settingsError } = await supabase
    .from('app_settings')
    .upsert({ 
      key: 'banner', 
      value: { enabled, message }
    })
  
  if (settingsError) {
    throw new Error(`Failed to save banner: ${settingsError.message}`)
  }
  
  // If publishing, also save to system_banners history
  if (enabled && message.trim()) {
    const { data: { user } } = await supabase.auth.getUser()
    
    const { error: historyError } = await supabase
      .from('system_banners')
      .insert({
        message: message.trim(),
        status: 'published',
        published_at: new Date().toISOString(),
        created_by: user?.id
      })
    
    // Don't fail if history insert fails, just log it
    if (historyError) {
      console.warn('Failed to save banner to history:', historyError.message)
    }
  }
  
  revalidatePath('/', 'layout')
}

export async function getBannerHistory() {
  await requireOrgAdmin()
  
  const supabase = await createSupabaseUserClient()
  
  const { data, error } = await supabase
    .from('system_banners')
    .select(`
      id,
      message,
      status,
      published_at,
      created_at,
      created_by
    `)
    .order('created_at', { ascending: false })
    .limit(50)
  
  if (error) {
    throw new Error(`Failed to get banner history: ${error.message}`)
  }
  
  return data || []
}

export async function republishBanner(id: string) {
  await requireOrgAdmin()
  
  const supabase = await createSupabaseUserClient()
  
  // Get the banner from history
  const { data: banner, error: fetchError } = await supabase
    .from('system_banners')
    .select('message')
    .eq('id', id)
    .single()
  
  if (fetchError) {
    throw new Error(`Failed to fetch banner: ${fetchError.message}`)
  }
  
  if (!banner) {
    throw new Error('Banner not found')
  }
  
  // Republish it
  await saveBanner(banner.message, true)
}