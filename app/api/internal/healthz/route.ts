import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface HealthCheck {
  auth: { status: 'ok' | 'error'; error?: string };
  database: { status: 'ok' | 'error'; error?: string };
  storage: { status: 'ok' | 'error'; error?: string };
}

export async function GET() {
  const health: HealthCheck = {
    auth: { status: 'error' },
    database: { status: 'error' },
    storage: { status: 'error' }
  };
  
  let allOk = true;

  try {
    const supabase = await createSupabaseServerClient();

    // Auth check
    try {
      await supabase.auth.getUser();
      health.auth = { status: 'ok' };
    } catch (error) {
      health.auth = { 
        status: 'error', 
        error: error instanceof Error ? error.message : 'Auth check failed' 
      };
      allOk = false;
    }

    // Database check
    try {
      const { error } = await supabase
        .from('organizations')
        .select('1')
        .limit(1);
      
      if (error) throw error;
      health.database = { status: 'ok' };
    } catch (error) {
      health.database = { 
        status: 'error', 
        error: error instanceof Error ? error.message : 'Database check failed' 
      };
      allOk = false;
    }

    // Storage check - try to create signed URL (expecting failure is ok)
    try {
      const testPath = 'branding/00000000-0000-0000-0000-000000000000/noop.txt';
      await supabase.storage
        .from('branding')
        .createSignedUrl(testPath, 60);
      
      // If we get here without error, storage is working
      health.storage = { status: 'ok' };
    } catch (error) {
      // Storage client responding (even with "not found") means it's working
      const errorMsg = error instanceof Error ? error.message : '';
      if (errorMsg.includes('not found') || errorMsg.includes('Object not found')) {
        health.storage = { status: 'ok' };
      } else {
        health.storage = { 
          status: 'error', 
          error: errorMsg || 'Storage check failed' 
        };
        allOk = false;
      }
    }

    return NextResponse.json(health, { status: allOk ? 200 : 503 });
  } catch (error) {
    return NextResponse.json(
      {
        auth: { status: 'error', error: 'Unexpected error' },
        database: { status: 'error', error: 'Unexpected error' },
        storage: { status: 'error', error: 'Unexpected error' }
      },
      { status: 503 }
    );
  }
}