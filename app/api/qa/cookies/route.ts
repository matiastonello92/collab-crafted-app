import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getProjectRef() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const match = url.match(/^https:\/\/([^.]+)\.supabase\.co/);
  return match ? match[1] : '';
}

export async function GET() {
  const jar = await cookies();
  const cookieNames = jar.getAll().map(c => c.name);
  const projectRef = getProjectRef();
  const expectedPrefix = `sb-${projectRef}-`;
  const hasAuthCookie = cookieNames.includes(`${expectedPrefix}auth-token`);
  return NextResponse.json(
    { cookieNames, expectedPrefix, hasAuthCookie },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
