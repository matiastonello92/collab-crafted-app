import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const jar = await cookies();
  const names = jar.getAll().map(c => c.name);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  let projectRef = '';
  try {
    projectRef = new URL(url).hostname.split('.')[0];
  } catch {
    projectRef = '';
  }
  const prefix = `sb-${projectRef}-auth-token`;
  const hasAuthCookie = names.some(n => n.startsWith(prefix));
  return NextResponse.json({ cookieNames: names, projectRef, hasAuthCookie });
}
