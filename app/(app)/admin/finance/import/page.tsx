import { supabaseAdmin } from "@/lib/supabase/server";
import { FinancialImporter } from "./components/FinancialImporter";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export default async function FinanceImportPage() {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get("sb-jwchmdivuwgfjrwvgtia-auth-token");
  
  if (!authCookie) {
    redirect("/auth/login");
  }

  let userId: string;
  try {
    const authData = JSON.parse(authCookie.value);
    userId = authData.user?.id;
    if (!userId) {
      redirect("/auth/login");
    }
  } catch {
    redirect("/auth/login");
  }

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("default_location_id, org_id")
    .eq("id", userId)
    .single();

  if (!profile?.org_id || !profile?.default_location_id) {
    redirect("/admin");
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Import Dati Finanziari</h1>
        <p className="text-muted-foreground mt-2">
          Carica file CSV con dati di vendita per analisi automatizzata AI
        </p>
      </div>

      <FinancialImporter 
        orgId={profile.org_id}
        locationId={profile.default_location_id}
        userId={userId}
      />
    </div>
  );
}
