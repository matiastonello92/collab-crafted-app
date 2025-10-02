import { NextResponse } from 'next/server';
import { createSupabaseServerActionClient } from '@/utils/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await createSupabaseServerActionClient();
  const { data, error } = await supabase.rpc('app_get_auth_snapshot');
  return NextResponse.json({ data, error: error?.message ?? null });
}
