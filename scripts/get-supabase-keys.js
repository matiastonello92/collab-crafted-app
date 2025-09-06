#!/usr/bin/env node

/**
 * Script to extract Supabase keys from environment or configuration
 * This script helps identify the correct API keys for the live environment
 */

console.log('🔍 Searching for Supabase credentials...\n')

// Check environment variables
const envVars = [
  'SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_URL', 
  'SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY'
]

console.log('📋 Environment Variables:')
envVars.forEach(varName => {
  const value = process.env[varName]
  if (value) {
    // Mask sensitive keys
    const maskedValue = value.length > 20 
      ? `${value.substring(0, 20)}...${value.substring(value.length - 10)}`
      : value
    console.log(`   ${varName}: ${maskedValue}`)
  } else {
    console.log(`   ${varName}: ❌ NOT SET`)
  }
})

console.log('\n🎯 Expected Configuration:')
console.log('   SUPABASE_URL: https://gsgqcsaycyjkbeepwoto.supabase.co')
console.log('   ANON_KEY: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (starts with eyJ)')
console.log('   SUPABASE_SERVICE_ROLE_KEY: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (starts with eyJ)')

console.log('\n💡 Next Steps:')
console.log('   1. Get keys from Supabase Dashboard > Settings > API')
console.log('   2. Update .env.local with correct values')
console.log('   3. Restart the development server')

// Try to detect if we're in a Supabase project
const fs = require('fs')
const path = require('path')

const supabaseConfigPath = path.join(process.cwd(), 'supabase', 'config.toml')
if (fs.existsSync(supabaseConfigPath)) {
  console.log('\n📁 Found supabase/config.toml - checking project configuration...')
  try {
    const config = fs.readFileSync(supabaseConfigPath, 'utf8')
    const projectIdMatch = config.match(/project_id = "([^"]+)"/)
    if (projectIdMatch) {
      console.log(`   Project ID: ${projectIdMatch[1]}`)
    }
  } catch (error) {
    console.log('   ⚠️ Could not read config.toml')
  }
}

console.log('\n🔧 To get the correct keys:')
console.log('   supabase status --local  # for local development')
console.log('   # OR visit: https://supabase.com/dashboard/project/gsgqcsaycyjkbeepwoto/settings/api')
