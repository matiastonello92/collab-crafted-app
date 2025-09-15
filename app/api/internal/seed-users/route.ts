import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  // Check setup token
  const setupToken = request.headers.get('X-Setup-Token');
  if (!setupToken || setupToken !== process.env.APP_SETUP_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ 
      error: 'Missing Supabase configuration' 
    }, { status: 500 });
  }

  // Create admin client with service role
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const usersToCreate = [
    {
      email: 'matias@pecoranegra.fr',
      password: '123456',
      app_metadata: {},
      user_metadata: { full_name: 'Matias' }
    },
    {
      email: 'menton@pecoranegra.fr',
      password: '123456', 
      app_metadata: {},
      user_metadata: { full_name: 'Menton' }
    },
    {
      email: 'tonellomatias@gmail.com',
      password: '123456',
      app_metadata: { platform_admin: true },
      user_metadata: { full_name: 'Matias Tonello' }
    }
  ];

  const results = [];
  let created = 0;
  let skipped = 0;

  for (const userData of usersToCreate) {
    try {
      // Try to create user first
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        email_confirm: true,
        app_metadata: userData.app_metadata,
        user_metadata: userData.user_metadata
      });

      if (newUser?.user) {
        results.push({
          email: userData.email,
          id: newUser.user.id,
          platform_admin: !!userData.app_metadata.platform_admin
        });
        created++;
      } else if (createError?.message?.includes('already exists') || createError?.message?.includes('already registered')) {
        // User exists, try to find them
        const { data: existingUsers } = await supabase.auth.admin.listUsers();
        const existingUser = existingUsers?.users?.find(u => u.email?.toLowerCase() === userData.email.toLowerCase());
        
        if (existingUser) {
          results.push({
            email: userData.email,
            id: existingUser.id,
            platform_admin: !!existingUser.app_metadata?.platform_admin
          });
          skipped++;
        }
      } else {
        console.error(`Error creating user ${userData.email}:`, createError);
        return NextResponse.json({ 
          error: `Failed to create user ${userData.email}: ${createError?.message}` 
        }, { status: 500 });
      }
    } catch (error) {
      console.error(`Exception creating user ${userData.email}:`, error);
      return NextResponse.json({ 
        error: `Exception creating user ${userData.email}` 
      }, { status: 500 });
    }
  }

  return NextResponse.json({
    users: results,
    created,
    skipped
  });
}