'use server'

import { revalidatePath } from 'next/cache'

export async function refreshInvitations() {
  revalidatePath('/admin/invitations')
}

export async function refreshUsers() {
  revalidatePath('/admin/users')
}