import { supabaseAdmin } from "@/lib/supabase/server";
import { CashClosureForm } from "./components/CashClosureForm";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export default async function NewClosurePage() {
  // Get auth token from cookies
  const cookieStore = await cookies();
  const authCookie = cookieStore.get("sb-jwchmdivuwgfjrwvgtia-auth-token");
  
  if (!authCookie) {
    redirect("/auth/login");
  }

  // Parse the auth token to get user info
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

  // Get user's profile with org and location info using admin client
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("default_location_id, org_id")
    .eq("id", userId)
    .single();

  if (profileError || !profile?.default_location_id || !profile?.org_id) {
    redirect("/admin");
  }

  // Check if user has access to this location
  const { data: membership } = await supabaseAdmin
    .from("memberships")
    .select("role")
    .eq("user_id", userId)
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
