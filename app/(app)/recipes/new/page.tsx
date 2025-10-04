import { createSupabaseServerClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import RecipeEditorPage from './RecipeEditorPage';

export default async function NewRecipePage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return <RecipeEditorPage />;
}
