import { supabaseAdmin } from "@/lib/supabase/server";
import { FinancialDashboard } from "./components/FinancialDashboard";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export default async function FinanceDashboardPage() {
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
