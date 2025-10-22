import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = 'https://jwchmdivuwgfjrwvgtia.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3Y2htZGl2dXdnZmpyd3ZndGlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1MTA4NjMsImV4cCI6MjA3MjA4Njg2M30.e_pN2KPqn9ZtNC32vwYNhjK7xzmIgpqOweqEmUIoPbA';

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
