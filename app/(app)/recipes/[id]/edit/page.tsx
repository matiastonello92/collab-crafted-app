import { createSupabaseServerClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import RecipeEditPage from './RecipeEditPage';

export default async function EditRecipePage({ params }: { params: { id: string } }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return <RecipeEditPage recipeId={params.id} />;
}
