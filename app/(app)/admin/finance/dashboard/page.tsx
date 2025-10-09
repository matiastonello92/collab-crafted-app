import { supabaseAdmin } from "@/lib/supabase/server";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { FinancialDashboard } from "./components/FinancialDashboard";
import { redirect } from "next/navigation";
import { getTranslation } from "@/lib/i18n/server";

export default async function FinanceDashboardPage() {
  const t = await getTranslation();
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

  return (
    <div className="container mx-auto py-8 px-4">
      <FinancialDashboard 
        orgId={profile.org_id}
        locationId={profile.default_location_id}
      />
    </div>
  );
}
