#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

// Environment variables validation
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL)');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Create admin client with service role
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

interface NewUser {
  email: string;
  password: string;
  platformAdmin?: boolean;
  fullName?: string;
}

const USERS_TO_CREATE: NewUser[] = [
  {
    email: 'matias@pecoranegra.fr',
    password: '123456',
    fullName: 'Matias'
  },
  {
    email: 'menton@pecoranegra.fr', 
    password: '123456',
    fullName: 'Menton'
  },
  {
    email: 'tonellomatias@gmail.com',
    password: '123456',
    platformAdmin: true,
    fullName: 'Matias Tonello (Platform Admin)'
  }
];

async function deleteAllUsers() {
  console.log('🔍 Fetching all existing users...');
  
  let deletedCount = 0;
  let page = 1;
  const perPage = 1000;

  while (true) {
    const { data: users, error } = await supabase.auth.admin.listUsers({
      page,
      perPage
    });

    if (error) {
      console.error('❌ Error fetching users:', error);
      throw error;
    }

    if (!users?.users || users.users.length === 0) {
      break;
    }

    console.log(`📄 Processing page ${page} - ${users.users.length} users`);

    for (const user of users.users) {
      const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
      if (deleteError) {
        console.error(`❌ Error deleting user ${user.email}:`, deleteError);
      } else {
        console.log(`🗑️  Deleted: ${user.email} (${user.id})`);
        deletedCount++;
      }
    }

    if (users.users.length < perPage) {
      break;
    }
    page++;
  }

  return deletedCount;
}

async function createUsers() {
  console.log('👤 Creating new users...');
  const createdUsers: Array<{ email: string; id: string; platformAdmin: boolean }> = [];

  for (const userData of USERS_TO_CREATE) {
    const userMetadata = {
      full_name: userData.fullName
    };

    const appMetadata: Record<string, any> = {};
    if (userData.platformAdmin) {
      appMetadata.platform_admin = true;
    }

    const { data: user, error } = await supabase.auth.admin.createUser({
      email: userData.email,
      password: userData.password,
      email_confirm: true,
      user_metadata: userMetadata,
      app_metadata: appMetadata
    });

    if (error) {
      console.error(`❌ Error creating user ${userData.email}:`, error);
      throw error;
    }

    if (user?.user) {
      console.log(`✅ Created: ${user.user.email} (${user.user.id})`);
      if (userData.platformAdmin) {
        console.log(`   🔑 Platform admin: true`);
      }
      
      createdUsers.push({
        email: user.user.email || userData.email,
        id: user.user.id,
        platformAdmin: userData.platformAdmin || false
      });
    }
  }

  return createdUsers;
}

async function main() {
  try {
    console.log('🚀 Starting auth reset process...\n');

    // Step 1: Delete all existing users
    const deletedCount = await deleteAllUsers();
    console.log(`\n✅ Deleted ${deletedCount} existing users\n`);

    // Step 2: Create new users
    const createdUsers = await createUsers();
    
    console.log('\n🎉 Auth reset completed successfully!\n');
    console.log('📊 Summary:');
    console.log(`   - Deleted users: ${deletedCount}`);
    console.log(`   - Created users: ${createdUsers.length}`);
    console.log('\n👥 New users:');
    
    createdUsers.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.email}`);
      console.log(`      ID: ${user.id}`);
      if (user.platformAdmin) {
        console.log(`      Platform Admin: ✅ true`);
      }
      console.log('');
    });

    // Verify platform admin
    const platformAdmin = createdUsers.find(u => u.platformAdmin);
    if (platformAdmin) {
      console.log(`🔐 Platform admin confirmed: ${platformAdmin.email}`);
    }

  } catch (error) {
    console.error('💥 Auth reset failed:', error);
    process.exit(1);
  }
}

// Execute if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default main;