import { supabaseAdmin } from "@/lib/supabase/server";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { FinancialImporter } from "./components/FinancialImporter";
import { redirect } from "next/navigation";
import { getTranslation } from "@/lib/i18n/server";

export default async function FinanceImportPage() {
  const t = await getTranslation();
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

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("default_location_id, org_id")
    .eq("id", user.id)
    .single();

  if (!profile?.org_id || !profile?.default_location_id) {
    redirect("/admin");
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">{t('finance.import.pageTitle')}</h1>
        <p className="text-muted-foreground mt-2">
          {t('finance.import.pageDescription')}
        </p>
      </div>

      <FinancialImporter 
        orgId={profile.org_id}
        locationId={profile.default_location_id}
        userId={user.id}
      />
    </div>
  );
}
