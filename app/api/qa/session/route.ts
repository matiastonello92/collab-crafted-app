import { NextResponse } from 'next/server';
import { createSupabaseUserClient } from '@/lib/supabase/clients';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await createSupabaseUserClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  return NextResponse.json({
    email: user?.email ?? null,
    userId: user?.id ?? null,
    error: error?.message ?? null,
  });
}
