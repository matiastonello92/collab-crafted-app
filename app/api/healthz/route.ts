import { NextResponse } from 'next/server';
import { createSupabaseUserClient } from '@/lib/supabase/clients';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createSupabaseUserClient();
    
    const { data, error } = await supabase.rpc('app_health');
    
    if (error) {
      return NextResponse.json(
        { 
          status: 'error', 
          db: { error: error.message } 
        },
        { status: 503 }
      );
    }

    const status = data?.status || 'error';
    const httpStatus = status === 'ok' ? 200 : 503;

    return NextResponse.json(
      { 
        status, 
        db: data 
      },
      { status: httpStatus }
    );
  } catch (error) {
    return NextResponse.json(
      { 
        status: 'error', 
        db: { error: error instanceof Error ? error.message : 'Unknown error' } 
      },
      { status: 503 }
    );
  }
}