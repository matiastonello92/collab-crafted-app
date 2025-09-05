import { getActiveLocationServer } from '@/lib/server/activeLocation';
import { getUserMemberships, getEffectivePermissions } from '@/lib/server/effectivePermissions';

// TODO: richiudere /qa a soli admin appena risolto il debug
export default async function WhoAmI() {
  const { active, locations } = await getActiveLocationServer();
  const mems = await getUserMemberships();
  const eff = await getEffectivePermissions(active?.id ?? null);

  return (
    <pre className="text-xs bg-muted p-3 rounded-lg overflow-auto">
      {JSON.stringify({
        activeLocationId: active?.id ?? null,
        locations,
        memberships: mems,
        effectivePermissions: Array.from(eff),
      }, null, 2)}
    </pre>
  );
}
