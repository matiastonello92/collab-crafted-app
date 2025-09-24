export interface UserSummary {
  id: string
  email?: string
  metadata?: Record<string, unknown> | null
}

export interface OrgSummary {
  id: string
  name?: string | null
  slug?: string | null
  timezone?: string | null
}

export interface LocationSummary {
  id: string
  name: string
  city?: string
}

export interface PermissionEnvelope {
  permissions: string[]
  role_level: number
  org_roles: string[]
  location_roles: string[]
}

export interface AppBootstrap extends PermissionEnvelope {
  context: {
    user: UserSummary | null
    org: OrgSummary | null
    location: LocationSummary | null
  }
  features: string[]
  plan_tags: string[]
  role_tags: string[]
}
