-- SUPABASE DATABASE SCHEMA OVERVIEW
-- Generated: 2025-09-25
-- Project: jwchmdivuwgfjrwvgtia

-- SCHEMAS
-- Active schemas (excluding system schemas):
-- - public: Main application schema with 30 tables
-- - auth: Supabase authentication schema (17 tables)
-- - storage: Supabase storage schema (7 tables)
-- - realtime: Supabase realtime schema (3 tables)
-- - vault: Supabase secrets schema (1 table + 1 view)

-- MAIN PUBLIC SCHEMA TABLES
-- Organizations & Multi-tenancy
CREATE SCHEMA IF NOT EXISTS public;

-- Core organizational structure
-- organizations: Main orgs (2 records)
-- locations: Physical locations (4 records) 
-- memberships: User-org relationships (3 records)
-- profiles: User profiles (3 records)

-- RBAC/Permission System
-- permissions: Available permissions (32 records)
-- roles: User roles per org
-- role_permissions: Role-permission mappings
-- user_roles_locations: User role assignments per location
-- user_permissions: Direct user permission overrides

-- Features & Plans
-- features: Available features
-- plans: Subscription plans
-- plan_features: Feature-plan mappings
-- org_plans: Active plans per org
-- org_feature_overrides: Org-specific feature overrides

-- Invitations System
-- invitations: User invitations
-- invitation_roles_locations: Role assignments for invites
-- invitation_permissions: Permission overrides for invites
-- invitation_job_tags: Job tag assignments for invites

-- Job Tags & User Management
-- job_tags: Available job titles/roles
-- user_job_tags: User job tag assignments
-- user_profiles: Extended user profile data

-- System Management
-- app_settings: Application configuration
-- audit_events: Audit trail
-- system_banners: System announcements
-- api_rate_limits: API rate limiting
-- platform_admins: Platform administrator assignments

-- Views
-- my_accessible_locations: View of locations accessible to current user

-- AUTHENTICATION SCHEMA
-- Standard Supabase Auth tables:
-- - users (3 records)
-- - sessions, refresh_tokens
-- - identities, mfa_factors, mfa_challenges
-- - audit_log_entries (322 records)

-- STORAGE SCHEMA  
-- Buckets:
-- - avatars (private)
-- - branding (private) 
-- - locations (public)
-- - photos (private)

-- RLS STATUS
-- All public tables have Row Level Security enabled
-- All auth tables have RLS enabled (managed by Supabase)
-- All storage tables have RLS enabled