/**
 * Legacy permission file - Re-exports from new location
 * 
 * @deprecated Import from '@/lib/permissions/index' or just '@/lib/permissions' instead
 * This file exists for backward compatibility only
 */

// Re-export everything from the new unified location
export * from './permissions/index'

// Legacy type aliases for backward compatibility
export type AnyPermission = string
export type PermBag = ReadonlyArray<string> | Set<string>
export type PermReq = string | ReadonlyArray<string>
