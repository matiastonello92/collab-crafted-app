import type { Permission } from './permissions/registry';
export type { Permission } from './permissions/registry';

export type AnyPermission = string;

export type PermBag = ReadonlyArray<AnyPermission> | Set<AnyPermission>;
export type PermReq = AnyPermission | ReadonlyArray<AnyPermission>;

type Dict = Record<string, string>

const synonymMap: Dict = {
  // existenti...
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
  // nuovi esempi granulari
  'locations:edit_opening_hours': 'locations:edit',
  'locations:edit_open_days': 'locations:edit',
  'approve_orders': 'orders:approve',
  'orders:send_order': 'orders:send_order',
  'users:invite': 'users:invite',
};

const groupRules: Array<{ test: RegExp; to: string | ((m: RegExpExecArray) => string) }> = [
  // module:edit_*  -> module:edit
  { test: /^([a-z0-9]+):edit_[a-z0-9:_-]+$/i, to: (m) => `${m[1]}:edit` },
  // module:view_*  -> module:view
  { test: /^([a-z0-9]+):view_[a-z0-9:_-]+$/i, to: (m) => `${m[1]}:view` },
  // orders:* granulari comuni -> mantieni le prime due parti
  { test: /^orders:(approve|create|send|review)(:[\w:-]+)?$/i, to: (m) => `orders:${m[1].toLowerCase()}` },
]

/** Normalizza il nome di un permesso */
export function normalizePermission(raw: string): string {
  if (!raw) return ''
  // uniforma separatori
  const colonized = String(raw).trim().toLowerCase().replace(/[.\s]/g, ':').replace(/_{2,}/g, '_')
  // sinonimi espliciti
  if (synonymMap[colonized]) return synonymMap[colonized]
  // regole di gruppo
  for (const rule of groupRules) {
    const m = rule.test.exec(colonized)
    if (m) return typeof rule.to === 'function' ? rule.to(m) : rule.to
  }
  // riduci triplette "a:b:c" -> "a:b" (fallback tollerante)
  const parts = colonized.split(':')
  if (parts.length >= 3) return `${parts[0]}:${parts[1]}`
  return colonized
}

/** utile per debug */
export function debugNormalize(names: string[], known: Set<string>) {
  const mapped: string[] = []
  const unknown: string[] = []
  for (const n of names) {
    const norm = normalizePermission(n)
    mapped.push(norm)
    if (!known.has(norm)) {
      // eslint-disable-next-line no-console
      console.warn('[PERM][UNMAPPED]', { db: n, normalized: norm })
      unknown.push(norm)
    }
  }
  return { mapped, unknown }
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