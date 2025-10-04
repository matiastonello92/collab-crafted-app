import { cookies } from 'next/headers'
import { Locale, t } from './index'

/**
 * Server-side translation function for App Router server components
 * Reads locale from cookies
 */
export async function getTranslation() {
  const cookieStore = await cookies()
  const locale = (cookieStore.get('klyra-locale')?.value as Locale) || 'it'
  
  return (key: string) => t(key, locale)
}
