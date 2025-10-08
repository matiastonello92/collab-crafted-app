import { supabaseAdmin } from "@/lib/supabase/server";
import { RecipientsManager } from "./components/RecipientsManager";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export default async function RecipientsPage() {
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
    .select("org_id")
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
        <h1 className="text-3xl font-bold tracking-tight">Destinatari Email Report</h1>
        <p className="text-muted-foreground mt-2">
          Gestisci chi riceve i report giornalieri di chiusura cassa
        </p>
      </div>

      <RecipientsManager 
        orgId={profile.org_id}
        locations={locations || []}
      />
    </div>
  );
}
