import { supabaseAdmin } from "@/lib/supabase/server";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { CashClosureForm } from "./components/CashClosureForm";
import { redirect } from "next/navigation";

export default async function NewClosurePage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect("/auth/login");
  }

  // Check finance:create permission
  const { data: hasPermission } = await supabase
    .rpc('user_has_permission', { 
      p_user: user.id, 
      p_permission: 'finance:create'
    });

  if (!hasPermission) {
    redirect("/access-denied");
  }

  // Get user's profile with org and location info using admin client
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("default_location_id, org_id")
    .eq("id", user.id)
    .single();

  if (profileError || !profile?.default_location_id || !profile?.org_id) {
    redirect("/admin");
  }

  // Check if user has access to this location
  const { data: membership } = await supabaseAdmin
    .from("memberships")
    .select("role")
    .eq("user_id", user.id)
    .eq("org_id", profile.org_id)
    .single();

  if (!membership) {
    redirect("/admin");
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Nuova Chiusura di Cassa</h1>
        <p className="text-muted-foreground mt-2">
          Registra la chiusura giornaliera di cassa e invia il report via email
        </p>
      </div>

      <CashClosureForm 
        locationId={profile.default_location_id} 
        orgId={profile.org_id}
      />
    </div>
  );
}
