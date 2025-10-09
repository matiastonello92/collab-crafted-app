import { supabaseAdmin } from "@/lib/supabase/server";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { PaymentMethodsManager } from "./components/PaymentMethodsManager";
import { redirect } from "next/navigation";

export default async function PaymentMethodsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect("/auth/login");
  }

  // Check finance:manage permission
  const { data: hasPermission } = await supabase
    .rpc('user_has_permission', { 
      p_user: user.id, 
      p_permission: 'finance:manage'
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
        <h1 className="text-3xl font-bold tracking-tight">Metodi di Pagamento</h1>
        <p className="text-muted-foreground mt-2">
          Gestisci i metodi di pagamento disponibili per le chiusure di cassa
        </p>
      </div>

      <PaymentMethodsManager 
        orgId={profile.org_id}
        defaultLocationId={profile.default_location_id}
        locations={locations || []}
      />
    </div>
  );
}
