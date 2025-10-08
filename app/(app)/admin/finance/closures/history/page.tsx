import { supabaseAdmin } from "@/lib/supabase/server";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { ClosuresHistory } from "./components/ClosuresHistory";
import { redirect } from "next/navigation";

export default async function ClosuresHistoryPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect("/auth/login");
  }

  // Check finance:view permission
  const { data: hasPermission } = await supabase
    .rpc('user_has_permission', { 
      p_user: user.id, 
      p_permission: 'finance:view'
    });

  if (!hasPermission) {
    redirect("/access-denied");
  }

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("default_location_id, org_id")
    .eq("id", user.id)
    .single();

  if (!profile?.org_id) {
    redirect("/admin");
  }

  const { data: locations } = await supabaseAdmin
    .from("locations")
    .select("id, name")
    .eq("org_id", profile.org_id)
    .eq("is_active", true)
    .order("name");

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Storico Chiusure</h1>
        <p className="text-muted-foreground mt-2">
          Consulta e gestisci tutte le chiusure di cassa registrate
        </p>
      </div>

      <ClosuresHistory 
        orgId={profile.org_id}
        defaultLocationId={profile.default_location_id}
        locations={locations || []}
      />
    </div>
  );
}
