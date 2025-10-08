import { supabaseAdmin } from "@/lib/supabase/server";
import { ClosuresHistory } from "./components/ClosuresHistory";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export default async function ClosuresHistoryPage() {
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
