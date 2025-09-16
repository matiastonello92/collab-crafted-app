"use client";

import * as React from "react";
import { Building2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { setAppContext } from "@/lib/appContext";
import { useAppStore } from "@/lib/store";
import { createSupabaseBrowserClient } from "@/utils/supabase/client";
import { Label } from "@/components/ui/label";

interface OrganizationOption {
  id: string;
  name: string;
}

export function OrgSwitcher() {
  const router = useRouter();
  const context = useAppStore(state => state.context);
  const setContext = useAppStore(state => state.setContext);
  const [orgs, setOrgs] = React.useState<OrganizationOption[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  React.useEffect(() => {
    let active = true;
    async function loadOrganizations() {
      setError(null);
      setLoading(true);
      try {
        const supabase = createSupabaseBrowserClient();
        const { data: userResult } = await supabase.auth.getUser();
        const user = userResult.user;
        if (!user) {
          if (active) setOrgs([]);
          return;
        }

        const { data, error: queryError } = await supabase
          .from("memberships")
          .select("org_id, organizations(name)")
          .eq("user_id", user.id);

        if (queryError) throw queryError;

        type MembershipRow = {
          org_id: string | null;
          organizations: { name: string | null } | null;
        };

        const mapped = ((data ?? []) as MembershipRow[])
          .map<OrganizationOption | null>(item => {
            if (!item.org_id) return null;
            return {
              id: item.org_id,
              name: item.organizations?.name ?? "Organizzazione",
            };
          })
          .filter((option): option is OrganizationOption => option !== null)
          .filter((option, index, array) => array.findIndex(candidate => candidate.id === option.id) === index)
          .sort((a, b) => a.name.localeCompare(b.name));

        if (active) {
          setOrgs(mapped);
          if (!context.org_id && mapped.length > 0) {
            const nextContext = { ...useAppStore.getState().context, org_id: mapped[0].id };
            setContext(nextContext);
          }
        }
      } catch (cause) {
        console.error("Failed to load organizations", cause);
        if (active) {
          setError("Impossibile caricare le organizzazioni");
          setOrgs([]);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadOrganizations();
    return () => {
      active = false;
    };
  }, [context.org_id, setContext]);

  const handleChange = (orgId: string) => {
    startTransition(async () => {
      const previous = useAppStore.getState().context;
      setContext({ ...previous, org_id: orgId, location_id: null, location_name: null });
      await setAppContext(orgId, null);
      router.refresh();
    });
  };

  const hasOptions = orgs.length > 0;

  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor="org-switcher" className="sr-only">
        Seleziona organizzazione
      </Label>
      <div className="flex items-center gap-2 rounded-lg border border-input/80 bg-card px-3 py-2 shadow-sm">
        <Building2 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            Caricamento...
          </div>
        ) : hasOptions ? (
          <select
            id="org-switcher"
            className="min-w-[10rem] bg-transparent text-sm text-foreground outline-none"
            value={context.org_id ?? orgs[0]?.id ?? ""}
            onChange={event => handleChange(event.target.value)}
            disabled={isPending}
            aria-describedby={error ? "org-switcher-error" : undefined}
          >
            {orgs.map(org => (
              <option key={org.id} value={org.id} className="bg-card text-foreground">
                {org.name}
              </option>
            ))}
          </select>
        ) : (
          <span className="text-sm text-muted-foreground">Nessuna organizzazione</span>
        )}
      </div>
      {error ? (
        <span id="org-switcher-error" className="text-xs text-warning">
          {error}
        </span>
      ) : null}
    </div>
  );
}
