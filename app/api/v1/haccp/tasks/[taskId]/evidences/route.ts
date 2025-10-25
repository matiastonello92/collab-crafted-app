import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerActionClient } from '@/utils/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  try {
    const supabase = await createSupabaseServerActionClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: hasPermission } = await supabase.rpc('user_has_permission', {
      p_user: user.id,
      p_permission: 'haccp:check'
    });

    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get task to verify org/location
    const { data: task } = await supabase
      .from('haccp_tasks')
      .select('org_id, location_id')
      .eq('id', params.taskId)
      .single();

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const caption = formData.get('caption') as string;

    if (!file) {
      return NextResponse.json({ error: 'File required' }, { status: 400 });
    }

    // Upload to storage
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${params.taskId}/${Date.now()}.${fileExt}`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('haccp-evidence')
      .upload(fileName, file, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    // Create evidence record
    const { data: evidence, error: insertError } = await supabase
      .from('haccp_evidences')
      .insert({
        org_id: task.org_id,
        location_id: task.location_id,
        task_id: params.taskId,
        file_url: uploadData.path,
        file_type: file.type,
        file_size: file.size,
        caption,
        uploaded_by: user.id
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('haccp-evidence')
      .getPublicUrl(uploadData.path);

    return NextResponse.json({
      evidence: {
        ...evidence,
        public_url: urlData.publicUrl
      }
    }, { status: 201 });
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  try {
    const supabase = await createSupabaseServerActionClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const evidenceId = searchParams.get('evidence_id');

    if (!evidenceId) {
      return NextResponse.json({ error: 'evidence_id required' }, { status: 400 });
    }

    // Get evidence to check ownership and get file path
    const { data: evidence } = await supabase
      .from('haccp_evidences')
      .select('file_url, uploaded_by')
      .eq('id', evidenceId)
      .single();

    if (!evidence) {
      return NextResponse.json({ error: 'Evidence not found' }, { status: 404 });
    }

    if (evidence.uploaded_by !== user.id) {
      return NextResponse.json({ error: 'Can only delete own evidences' }, { status: 403 });
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('haccp-evidence')
      .remove([evidence.file_url]);

    if (storageError) {
      console.error('Storage delete error:', storageError);
    }

    // Delete record
    const { error: deleteError } = await supabase
      .from('haccp_evidences')
      .delete()
      .eq('id', evidenceId);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
