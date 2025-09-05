import type { Permission } from './permissions/registry';
export type { Permission } from './permissions/registry';

export type AnyPermission = string;

export type PermBag = ReadonlyArray<AnyPermission> | Set<AnyPermission>;
export type PermReq = AnyPermission | ReadonlyArray<AnyPermission>;

/** Normalizza un contenitore di permessi in Set<string> */
export function toPermSet(perms: PermBag): Set<AnyPermission> {
  return perms instanceof Set ? perms : new Set(perms);
}

/** Ritorna true se TUTTI i permessi richiesti sono presenti */
export function can(perms: PermBag, required: PermReq): boolean {
  const bag = toPermSet(perms);
  const reqs = Array.isArray(required) ? required : [required];
  return reqs.every(r => bag.has(r));
}

export async function getUserPermissions(): Promise<Permission[]> {
  const res = await fetch(`/api/v1/me/permissions`, { credentials: 'include' });
  if (!res.ok) return [];
  const json = await res.json();
  return Array.isArray(json?.permissions) ? (json.permissions as Permission[]) : [];
}
