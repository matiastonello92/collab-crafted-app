'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServerActionClient } from '@/utils/supabase/server'
import { requireOrgAdmin } from '@/lib/admin/guards'

interface UpdateUserSchedulableInput {
  userId: string
  isSchedulable: boolean
}

export async function updateUserSchedulable({ userId, isSchedulable }: UpdateUserSchedulableInput) {
  if (!userId) {
    return { success: false, message: 'Missing user identifier' }
  }

  await requireOrgAdmin()

  try {
    const supabase = await createSupabaseServerActionClient()
    const { error } = await supabase
      .from('profiles')
      .update({ is_schedulable: isSchedulable })
      .eq('id', userId)

    if (error) {
      console.error('Error updating schedulable status:', error)
      return { success: false, message: 'Unable to update scheduling status right now.' }
    }

    revalidatePath(`/admin/users/${userId}`)
    return { success: true }
  } catch (error) {
    console.error('Unexpected error updating schedulable status:', error)
    return { success: false, message: 'Unable to update scheduling status right now.' }
  }
}
