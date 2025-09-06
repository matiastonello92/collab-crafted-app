import type { Permission } from './permissions/registry';
export type { Permission } from './permissions/registry';

export type AnyPermission = string;

export type PermBag = ReadonlyArray<AnyPermission> | Set<AnyPermission>;
export type PermReq = AnyPermission | ReadonlyArray<AnyPermission>;

const synonymMap: Record<string, string> = {
  'manage:users': 'users:manage',
  'view:users': 'users:view',
  'assign:roles': 'users:manage',
  'invite:users': 'users:invite',
  'flags:view': 'flags:view',
  'locations:view': 'locations:view',
  'manage:inventory': 'inventory:manage',
  'view:inventory': 'inventory:view',
  'manage:orders': 'orders:manage',
  'view:orders': 'orders:view',
  'manage:haccp': 'haccp:manage',
  'view:haccp': 'haccp:view',
  'manage:maintenance': 'maintenance:manage',
  'view:maintenance': 'maintenance:view',
  'manage:financial': 'financial:manage',
  'view:financial': 'financial:view',
  'manage:settings': 'settings:manage',
  'view:settings': 'settings:view',
};

/** Normalizza il nome di un permesso */
export function normalizePermission(p: string): string {
  const colonized = p.toLowerCase().replace(/[._]/g, ':');
  return synonymMap[colonized] ?? colonized;
}

/** Normalizza e deduplica una lista di permessi */
export function normalizeSet(list: string[]): string[] {
  return Array.from(new Set(list.map(normalizePermission)));
}

/** Normalizza un contenitore di permessi in Set<string> */
export function toPermSet(perms: PermBag): Set<AnyPermission> {
  const arr = perms instanceof Set ? Array.from(perms) : perms;
  return new Set(normalizeSet(arr as string[]));
}

/** Ritorna true se TUTTI i permessi richiesti sono presenti */
export function can(perms: PermBag, required: PermReq): boolean {
  const bag = toPermSet(perms);
  if (bag.has('*')) return true;
  const reqs = Array.isArray(required) ? required : [required];
  return reqs.map(normalizePermission).every(r => {
    if (bag.has(r)) return true;
    const module = r.split(':')[0];
    return bag.has(`${module}:*`);
  });
}

export async function getUserPermissions(locationId?: string): Promise<Permission[]> {
  const qs = new URLSearchParams();
  if (locationId) qs.set('locationId', locationId);
  const res = await fetch(`/api/v1/me/permissions?${qs.toString()}`, { credentials: 'include' });
  if (!res.ok) return [];
  const json = await res.json();
  const perms = Array.isArray(json?.permissions) ? (json.permissions as Permission[]) : [];
  return normalizeSet(perms);
}
