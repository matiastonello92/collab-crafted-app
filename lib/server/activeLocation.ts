import { getAuthSnapshot } from './authContext';

type Loc = { id: string; name: string };
type Meta = { error?: string };

/** @deprecated Use getAuthSnapshot instead */
export async function getUserLocations(): Promise<{ user: { id: string } | null; locations: Loc[]; meta: Meta }> {
  const snap = await getAuthSnapshot();
  return { user: null, locations: snap.locations, meta: {} };
}

/** @deprecated Use getAuthSnapshot instead */
export async function getActiveLocationServer(): Promise<{ active: Loc | null; locations: Loc[]; persisted: boolean; meta: Meta }> {
  const snap = await getAuthSnapshot();
  const active = snap.locations.find(l => l.id === snap.activeLocationId) ?? null;
  return { active, locations: snap.locations, persisted: true, meta: {} };
}

