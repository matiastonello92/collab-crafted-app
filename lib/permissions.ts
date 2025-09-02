import type { Permission } from './permissions/registry';
export type { Permission } from './permissions/registry';

type PermInput = Iterable<Permission> | Array<Permission> | Set<Permission>;
type ReqInput = Permission | Permission[];

export function can(perms: PermInput, required: ReqInput): boolean {
  const bag = perms instanceof Set ? perms : new Set(perms as Iterable<Permission>);
  const reqs = Array.isArray(required) ? required : [required];
  return reqs.every(r => bag.has(r));
}

export function toPermSet(perms: PermInput): Set<Permission> {
  return perms instanceof Set ? perms : new Set(perms as Iterable<Permission>);
}

/**
 * Verifica combinazioni di permessi:
 * - anyOf: basta 1 permesso
 * - allOf: servono tutti
 * Se entrambi presenti: deve passare sia anyOf (almeno uno) sia allOf (tutti).
 */
export function canMultiple(
  perms: PermInput,
  opts?: { anyOf?: Permission[]; allOf?: Permission[] }
): boolean {
  const anyOk = !opts?.anyOf || opts.anyOf.some(p => can(perms, p));
  const allOk = !opts?.allOf || opts.allOf.every(p => can(perms, p));
  return anyOk && allOk;
}

export async function getUserPermissions(orgId?: string, locationId?: string): Promise<Permission[]> {
  const qs = new URLSearchParams();
  if (orgId) qs.set('orgId', orgId);
  if (locationId) qs.set('locationId', locationId);
  const res = await fetch(`/api/v1/me/permissions?${qs.toString()}`, { credentials: 'include' });
  if (!res.ok) return [];
  const json = await res.json();
  return Array.isArray(json?.permissions) ? (json.permissions as Permission[]) : [];
}
