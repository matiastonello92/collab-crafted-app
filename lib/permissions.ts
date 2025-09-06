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
  'manage_users': 'users:manage',
  'view_users': 'users:view',
  'invite_users': 'users:invite',
  'assign_roles': 'users:manage',
  'flags:view': 'flags:view',
  'flags.view': 'flags:view',
  'view_flags': 'flags:view',
  'locations:view': 'locations:view',
  'locations.view': 'locations:view',
  'view_locations': 'locations:view',
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
  'manage_settings': 'settings:manage',
  'view_settings': 'settings:view',
};

/** Normalizza il nome di un permesso */
export function normalizePermission(p: string): string {
  const colonized = p.toLowerCase().replace(/[._]/g, ':');
  return synonymMap[colonized] ?? colonized;
}

/** Normalizza e deduplica una lista di permessi */
export function normalizeSet(list: Array<string | Permission>): Permission[] {
  const out = new Set<Permission>();
  for (const raw of list) {
    const n = normalizePermission(String(raw)) as Permission;
    if (n) out.add(n);
  }
  return Array.from(out);
}

/** Normalizza un contenitore di permessi in Set<string> */
export function toPermSet(perms: PermBag): Set<AnyPermission> {
  const arr = perms instanceof Set ? Array.from(perms) : perms;
  return new Set<AnyPermission>(
    normalizeSet(arr as Array<string | Permission>) as AnyPermission[]
  );
}

/** Ritorna true se TUTTI i permessi richiesti sono presenti */
export function can(perms: PermBag, required: PermReq): boolean {
  const rawBag = perms instanceof Set ? Array.from(perms) : perms;
  if (rawBag.some(p => String(p) === '*')) return true;
  const bag = toPermSet(rawBag);
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
  const res = await fetch(`/api/v1/me/permissions?${qs.toString()}`, {
    credentials: 'include',
  });
  if (!res.ok) return [];
  const json = await res.json();
  const perms = Array.isArray(json?.permissions)
    ? (json.permissions as Array<string | Permission>)
    : [];
  return normalizeSet(perms);
}