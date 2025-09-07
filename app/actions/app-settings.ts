'use server'

import { createSupabaseServerClient } from '@/utils/supabase/server'
import { requireAdmin } from '@/lib/admin/guards'
import { revalidatePath } from 'next/cache'

export async function getAppSetting(key: string) {
  const supabase = await createSupabaseServerClient()
  
  const { data, error } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', key)
    .single()
  
  if (error && error.code !== 'PGRST116') { // Not found is ok
    throw new Error(`Failed to get setting ${key}: ${error.message}`)
  }
  
  return data?.value || {}
}

export async function setAppSetting(key: string, value: any) {
  // Admin guard
  await requireAdmin()
  
  const supabase = await createSupabaseServerClient()
  
  const { error } = await supabase
    .from('app_settings')
    .upsert({ 
      key, 
      value: typeof value === 'object' ? value : { value }
    })
  
  if (error) {
    throw new Error(`Failed to set setting ${key}: ${error.message}`)
  }
  
  revalidatePath('/admin/settings')
}

export async function uploadLogo(formData: FormData) {
  // Admin guard
  await requireAdmin()
  
  const supabase = await createSupabaseServerClient()
  const file = formData.get('logo') as File
  
  if (!file) {
    throw new Error('No file provided')
  }
  
  // Generate unique filename
  const fileExt = file.name.split('.').pop()
  const fileName = `logo-${Date.now()}.${fileExt}`
  
  const { data, error } = await supabase.storage
    .from('branding')
    .upload(fileName, file, {
      upsert: true
    })
  
  if (error) {
    throw new Error(`Failed to upload logo: ${error.message}`)
  }
  
  // Get public URL
  const { data: urlData } = supabase.storage
    .from('branding')
    .getPublicUrl(data.path)
  
  // Save to app_settings
  await setAppSetting('branding', { logo_url: urlData.publicUrl })
  
  return urlData.publicUrl
}