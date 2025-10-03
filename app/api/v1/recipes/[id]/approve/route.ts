import { createSupabaseServerActionClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

// POST /api/v1/recipes/:id/approve - Approve recipe directly (manager/admin only)
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createSupabaseServerActionClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check recipe status
    const { data: existingRecipe, error: checkError } = await supabase
      .from('recipes')
      .select('status, org_id, location_id, title, photo_url')
      .eq('id', params.id)
      .single();

    if (checkError) throw checkError;

    if (existingRecipe.status === 'published') {
      return NextResponse.json(
        { error: 'Recipe already published' },
        { status: 400 }
      );
    }

    // Check photo required
    if (!existingRecipe.photo_url) {
      return NextResponse.json(
        { error: 'Photo required before approval' },
        { status: 400 }
      );
    }

    // Check permission (manager/admin can approve)
    const canManage = await canManageRecipe(
      supabase,
      user.id,
      existingRecipe.org_id,
      existingRecipe.location_id
    );

    if (!canManage) {
      return NextResponse.json(
        { error: 'Only managers can approve recipes' },
        { status: 403 }
      );
    }

    // Transition: draft/submitted → published
    const { data: recipe, error } = await supabase
      .from('recipes')
      .update({
        status: 'published',
        published_by: user.id,
        published_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ 
      recipe,
      message: `Recipe "${existingRecipe.title}" approved and published`
    });
  } catch (error: any) {
    console.error('[recipes/:id/approve/POST]', error);
    return NextResponse.json(
      { error: error.message || 'Failed to approve recipe' },
      { status: 500 }
    );
  }
}

// Helper function to check if user can manage recipes
async function canManageRecipe(
  supabase: any,
  userId: string,
  orgId: string,
  locationId: string
): Promise<boolean> {
  // Check if platform admin
  const { data: platformAdmin } = await supabase
    .rpc('is_platform_admin');

  if (platformAdmin) return true;

  // Check if user has shifts:manage permission in this location
  const { data: hasPermission } = await supabase
    .rpc('user_has_permission', {
      p_user: userId,
      p_permission: 'shifts:manage'
    });

  if (!hasPermission) return false;

  // Verify user is in org and location
  const { data: inOrg } = await supabase
    .rpc('user_in_org', { p_org: orgId });

  const { data: inLocation } = await supabase
    .rpc('user_in_location', { p_location: locationId });

  return inOrg && inLocation;
}
