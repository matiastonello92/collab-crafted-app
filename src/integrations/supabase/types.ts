export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      api_rate_limits: {
        Row: {
          hits: number
          key: string
          user_id: string
          window_start: string
        }
        Insert: {
          hits?: number
          key: string
          user_id: string
          window_start: string
        }
        Update: {
          hits?: number
          key?: string
          user_id?: string
          window_start?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          key: string
          org_id: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          org_id: string
          updated_at?: string
          value?: Json
        }
        Update: {
          key?: string
          org_id?: string
          updated_at?: string
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "app_settings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["org_id"]
          },
        ]
      }
      audit_events: {
        Row: {
          created_at: string
          event_key: string
          id: number
          org_id: string
          payload: Json
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_key: string
          id?: number
          org_id: string
          payload?: Json
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_key?: string
          id?: number
          org_id?: string
          payload?: Json
          user_id?: string | null
        }
        Relationships: []
      }
      features: {
        Row: {
          description: string | null
          feature_id: string
          key: string
          name: string
        }
        Insert: {
          description?: string | null
          feature_id?: string
          key: string
          name: string
        }
        Update: {
          description?: string | null
          feature_id?: string
          key?: string
          name?: string
        }
        Relationships: []
      }
      invitation_job_tags: {
        Row: {
          created_at: string
          created_by: string | null
          invitation_id: string
          location_id: string
          org_id: string
          tag_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          invitation_id: string
          location_id: string
          org_id: string
          tag_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          invitation_id?: string
          location_id?: string
          org_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitation_job_tags_invitation_id_fkey"
            columns: ["invitation_id"]
            isOneToOne: false
            referencedRelation: "invitations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitation_job_tags_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitation_job_tags_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "my_accessible_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitation_job_tags_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "invitation_job_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "job_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      invitation_permissions: {
        Row: {
          granted: boolean
          id: string
          invitation_id: string | null
          location_id: string | null
          org_id: string
          permission_id: string | null
        }
        Insert: {
          granted?: boolean
          id?: string
          invitation_id?: string | null
          location_id?: string | null
          org_id: string
          permission_id?: string | null
        }
        Update: {
          granted?: boolean
          id?: string
          invitation_id?: string | null
          location_id?: string | null
          org_id?: string
          permission_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invitation_permissions_invitation_id_fkey"
            columns: ["invitation_id"]
            isOneToOne: false
            referencedRelation: "invitations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitation_permissions_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitation_permissions_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "my_accessible_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitation_permissions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "invitation_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
        ]
      }
      invitation_roles_locations: {
        Row: {
          id: string
          invitation_id: string | null
          location_id: string | null
          org_id: string
          role_id: string | null
        }
        Insert: {
          id?: string
          invitation_id?: string | null
          location_id?: string | null
          org_id: string
          role_id?: string | null
        }
        Update: {
          id?: string
          invitation_id?: string | null
          location_id?: string | null
          org_id?: string
          role_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invitation_roles_locations_invitation_id_fkey"
            columns: ["invitation_id"]
            isOneToOne: false
            referencedRelation: "invitations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitation_roles_locations_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitation_roles_locations_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "my_accessible_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitation_roles_locations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "invitation_roles_locations_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          email: string
          expires_at: string
          first_name: string | null
          id: string
          invited_by: string | null
          last_name: string | null
          notes: string | null
          org_id: string
          revoked_at: string | null
          status: string | null
          token: string
          updated_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          email: string
          expires_at: string
          first_name?: string | null
          id?: string
          invited_by?: string | null
          last_name?: string | null
          notes?: string | null
          org_id: string
          revoked_at?: string | null
          status?: string | null
          token: string
          updated_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          email?: string
          expires_at?: string
          first_name?: string | null
          id?: string
          invited_by?: string | null
          last_name?: string | null
          notes?: string | null
          org_id?: string
          revoked_at?: string | null
          status?: string | null
          token?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invitations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["org_id"]
          },
        ]
      }
      job_tags: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          label: string
          name: string
          org_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          label: string
          name: string
          org_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string
          name?: string
          org_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_tags_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["org_id"]
          },
        ]
      }
      location_admins: {
        Row: {
          created_at: string
          location_id: string
          org_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          location_id: string
          org_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          location_id?: string
          org_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "location_admins_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "location_admins_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "my_accessible_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "location_admins_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["org_id"]
          },
        ]
      }
      location_admins_backup: {
        Row: {
          created_at: string | null
          location_id: string | null
          org_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          location_id?: string | null
          org_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          location_id?: string | null
          org_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      locations: {
        Row: {
          address: string | null
          address_line1: string | null
          address_line2: string | null
          city: string | null
          country: string | null
          created_at: string | null
          currency: string | null
          description: string | null
          email: string | null
          id: string
          is_active: boolean | null
          name: string
          open_days: string[] | null
          opening_hours: Json | null
          org_id: string
          phone: string | null
          photo_url: string | null
          postcode: string | null
          slug: string | null
          status: string | null
          timezone: string | null
          updated_at: string | null
          vat_number: string | null
        }
        Insert: {
          address?: string | null
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          open_days?: string[] | null
          opening_hours?: Json | null
          org_id: string
          phone?: string | null
          photo_url?: string | null
          postcode?: string | null
          slug?: string | null
          status?: string | null
          timezone?: string | null
          updated_at?: string | null
          vat_number?: string | null
        }
        Update: {
          address?: string | null
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          open_days?: string[] | null
          opening_hours?: Json | null
          org_id?: string
          phone?: string | null
          photo_url?: string | null
          postcode?: string | null
          slug?: string | null
          status?: string | null
          timezone?: string | null
          updated_at?: string | null
          vat_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "locations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["org_id"]
          },
        ]
      }
      memberships: {
        Row: {
          created_at: string
          org_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          org_id: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string
          org_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["org_id"]
          },
        ]
      }
      org_feature_overrides: {
        Row: {
          feature_id: string
          is_enabled: boolean | null
          limit_override: Json | null
          org_id: string
        }
        Insert: {
          feature_id: string
          is_enabled?: boolean | null
          limit_override?: Json | null
          org_id: string
        }
        Update: {
          feature_id?: string
          is_enabled?: boolean | null
          limit_override?: Json | null
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_feature_overrides_feature_id_fkey"
            columns: ["feature_id"]
            isOneToOne: false
            referencedRelation: "features"
            referencedColumns: ["feature_id"]
          },
          {
            foreignKeyName: "org_feature_overrides_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["org_id"]
          },
        ]
      }
      org_plans: {
        Row: {
          active_from: string
          active_to: string | null
          org_id: string
          plan_id: string
        }
        Insert: {
          active_from?: string
          active_to?: string | null
          org_id: string
          plan_id: string
        }
        Update: {
          active_from?: string
          active_to?: string | null
          org_id?: string
          plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_plans_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "org_plans_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["plan_id"]
          },
        ]
      }
      organization_domains: {
        Row: {
          created_at: string
          domain: string
          is_primary: boolean
          org_id: string
        }
        Insert: {
          created_at?: string
          domain: string
          is_primary?: boolean
          org_id: string
        }
        Update: {
          created_at?: string
          domain?: string
          is_primary?: boolean
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_domains_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["org_id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          name: string
          org_id: string
          slug: string
          status: string
          timezone: string
        }
        Insert: {
          created_at?: string
          name: string
          org_id?: string
          slug: string
          status?: string
          timezone?: string
        }
        Update: {
          created_at?: string
          name?: string
          org_id?: string
          slug?: string
          status?: string
          timezone?: string
        }
        Relationships: []
      }
      permission_preset_items: {
        Row: {
          created_at: string
          org_id: string
          permission: string
          preset_id: string
        }
        Insert: {
          created_at?: string
          org_id: string
          permission: string
          preset_id: string
        }
        Update: {
          created_at?: string
          org_id?: string
          permission?: string
          preset_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "permission_preset_items_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "permission_preset_items_preset_id_fkey"
            columns: ["preset_id"]
            isOneToOne: false
            referencedRelation: "permission_presets"
            referencedColumns: ["id"]
          },
        ]
      }
      permission_presets: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_system: boolean
          name: string
          org_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name: string
          org_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name?: string
          org_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "permission_presets_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["org_id"]
          },
        ]
      }
      permissions: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          display_name: string
          id: string
          name: string
          org_id: string
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          display_name: string
          id?: string
          name: string
          org_id: string
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          display_name?: string
          id?: string
          name?: string
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "permissions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["org_id"]
          },
        ]
      }
      plan_features: {
        Row: {
          feature_id: string
          is_enabled: boolean
          limits: Json | null
          plan_id: string
        }
        Insert: {
          feature_id: string
          is_enabled?: boolean
          limits?: Json | null
          plan_id: string
        }
        Update: {
          feature_id?: string
          is_enabled?: boolean
          limits?: Json | null
          plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_features_feature_id_fkey"
            columns: ["feature_id"]
            isOneToOne: false
            referencedRelation: "features"
            referencedColumns: ["feature_id"]
          },
          {
            foreignKeyName: "plan_features_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["plan_id"]
          },
        ]
      }
      plans: {
        Row: {
          description: string | null
          key: string
          name: string
          plan_id: string
        }
        Insert: {
          description?: string | null
          key: string
          name: string
          plan_id?: string
        }
        Update: {
          description?: string | null
          key?: string
          name?: string
          plan_id?: string
        }
        Relationships: []
      }
      platform_admins: {
        Row: {
          granted_at: string
          granted_by: string | null
          user_id: string
        }
        Insert: {
          granted_at?: string
          granted_by?: string | null
          user_id: string
        }
        Update: {
          granted_at?: string
          granted_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          default_location_id: string | null
          full_name: string | null
          id: string
          locale: string | null
          marketing_opt_in: boolean | null
          notif_prefs: Json | null
          org_id: string
          phone: string | null
          timezone: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          default_location_id?: string | null
          full_name?: string | null
          id: string
          locale?: string | null
          marketing_opt_in?: boolean | null
          notif_prefs?: Json | null
          org_id: string
          phone?: string | null
          timezone?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          default_location_id?: string | null
          full_name?: string | null
          id?: string
          locale?: string | null
          marketing_opt_in?: boolean | null
          notif_prefs?: Json | null
          org_id?: string
          phone?: string | null
          timezone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_default_location_fk"
            columns: ["default_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_default_location_fk"
            columns: ["default_location_id"]
            isOneToOne: false
            referencedRelation: "my_accessible_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["org_id"]
          },
        ]
      }
      role_permission_presets: {
        Row: {
          created_at: string
          org_id: string
          preset_id: string
          role_id: string
        }
        Insert: {
          created_at?: string
          org_id: string
          preset_id: string
          role_id: string
        }
        Update: {
          created_at?: string
          org_id?: string
          preset_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permission_presets_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "role_permission_presets_preset_id_fkey"
            columns: ["preset_id"]
            isOneToOne: false
            referencedRelation: "permission_presets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permission_presets_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          created_at: string | null
          id: string
          org_id: string
          permission_id: string | null
          role_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          org_id: string
          permission_id?: string | null
          role_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          org_id?: string
          permission_id?: string | null
          role_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string | null
          description: string | null
          display_name: string
          id: string
          is_active: boolean | null
          level: number
          name: string
          org_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_name: string
          id?: string
          is_active?: boolean | null
          level?: number
          name: string
          org_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_name?: string
          id?: string
          is_active?: boolean | null
          level?: number
          name?: string
          org_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "roles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["org_id"]
          },
        ]
      }
      system_banners: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          message: string
          org_id: string
          published_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          message: string
          org_id: string
          published_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          message?: string
          org_id?: string
          published_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "system_banners_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["org_id"]
          },
        ]
      }
      user_job_tags: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          location_id: string
          org_id: string
          tag_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          location_id: string
          org_id: string
          tag_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          location_id?: string
          org_id?: string
          tag_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_job_tags_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_job_tags_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "my_accessible_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_job_tags_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "user_job_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "job_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      user_permissions: {
        Row: {
          granted: boolean | null
          granted_at: string | null
          granted_by: string | null
          id: string
          location_id: string | null
          org_id: string
          permission_id: string | null
          user_id: string | null
        }
        Insert: {
          granted?: boolean | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          location_id?: string | null
          org_id: string
          permission_id?: string | null
          user_id?: string | null
        }
        Update: {
          granted?: boolean | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          location_id?: string | null
          org_id?: string
          permission_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_permissions_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_permissions_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "my_accessible_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_permissions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "user_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          avatar_url: string | null
          can_invite_users: boolean | null
          created_at: string | null
          first_name: string | null
          id: string
          is_active: boolean | null
          last_name: string | null
          notes: string | null
          org_id: string
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          can_invite_users?: boolean | null
          created_at?: string | null
          first_name?: string | null
          id: string
          is_active?: boolean | null
          last_name?: string | null
          notes?: string | null
          org_id: string
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          can_invite_users?: boolean | null
          created_at?: string | null
          first_name?: string | null
          id?: string
          is_active?: boolean | null
          last_name?: string | null
          notes?: string | null
          org_id?: string
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["org_id"]
          },
        ]
      }
      user_roles_locations: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          id: string
          is_active: boolean | null
          location_id: string | null
          org_id: string
          role_id: string | null
          user_id: string | null
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          is_active?: boolean | null
          location_id?: string | null
          org_id: string
          role_id?: string | null
          user_id?: string | null
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          is_active?: boolean | null
          location_id?: string | null
          org_id?: string
          role_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_locations_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_locations_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "my_accessible_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_locations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "user_roles_locations_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      my_accessible_locations: {
        Row: {
          address: string | null
          address_line1: string | null
          address_line2: string | null
          city: string | null
          country: string | null
          created_at: string | null
          currency: string | null
          description: string | null
          email: string | null
          id: string | null
          is_active: boolean | null
          name: string | null
          open_days: string[] | null
          opening_hours: Json | null
          org_id: string | null
          phone: string | null
          photo_url: string | null
          postcode: string | null
          slug: string | null
          status: string | null
          timezone: string | null
          updated_at: string | null
          vat_number: string | null
        }
        Insert: {
          address?: string | null
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          email?: string | null
          id?: string | null
          is_active?: boolean | null
          name?: string | null
          open_days?: string[] | null
          opening_hours?: Json | null
          org_id?: string | null
          phone?: string | null
          photo_url?: string | null
          postcode?: string | null
          slug?: string | null
          status?: string | null
          timezone?: string | null
          updated_at?: string | null
          vat_number?: string | null
        }
        Update: {
          address?: string | null
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          email?: string | null
          id?: string | null
          is_active?: boolean | null
          name?: string | null
          open_days?: string[] | null
          opening_hours?: Json | null
          org_id?: string | null
          phone?: string | null
          photo_url?: string | null
          postcode?: string | null
          slug?: string | null
          status?: string | null
          timezone?: string | null
          updated_at?: string | null
          vat_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "locations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["org_id"]
          },
        ]
      }
    }
    Functions: {
      _count_null_org: {
        Args: { p_table: string }
        Returns: number
      }
      _mismatch_count: {
        Args: { p_table: string }
        Returns: number
      }
      admin_assign_manager: {
        Args: { loc_id: string; target_email: string }
        Returns: undefined
      }
      admin_list_location_admins: {
        Args: { loc_id: string }
        Returns: {
          created_at: string
          email: string
          user_id: string
        }[]
      }
      admin_remove_manager: {
        Args: { loc_id: string; target_email: string }
        Returns: undefined
      }
      app_health: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      citext: {
        Args: { "": boolean } | { "": string } | { "": unknown }
        Returns: string
      }
      citext_hash: {
        Args: { "": string }
        Returns: number
      }
      citextin: {
        Args: { "": unknown }
        Returns: string
      }
      citextout: {
        Args: { "": string }
        Returns: unknown
      }
      citextrecv: {
        Args: { "": unknown }
        Returns: string
      }
      citextsend: {
        Args: { "": string }
        Returns: string
      }
      create_default_permissions_for_org: {
        Args: { p_org_id: string }
        Returns: number
      }
      feature_enabled: {
        Args: { p_feature_key: string; p_org: string }
        Returns: boolean
      }
      feature_limits: {
        Args: { p_feature_key: string; p_org: string }
        Returns: Json
      }
      get_active_plan_id: {
        Args: { p_org: string }
        Returns: string
      }
      get_my_default_location: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      invitation_accept_v2: {
        Args: { p_token: string }
        Returns: Json
      }
      invitation_create_v2: {
        Args:
          | {
              p_days?: number
              p_email: string
              p_job_tags?: Json
              p_location_ids: string[]
              p_overrides?: Json
              p_role_id: string
            }
          | {
              p_days?: number
              p_email: string
              p_location_ids: string[]
              p_overrides?: Json
              p_role_id: string
            }
        Returns: {
          accepted_at: string | null
          created_at: string | null
          email: string
          expires_at: string
          first_name: string | null
          id: string
          invited_by: string | null
          last_name: string | null
          notes: string | null
          org_id: string
          revoked_at: string | null
          status: string | null
          token: string
          updated_at: string | null
        }
      }
      invitation_validate_v2: {
        Args: { p_token: string }
        Returns: {
          email: string
          expires_at: string
          is_valid: boolean
          location_ids: string[]
          overrides: Json
          role_name: string
        }[]
      }
      is_manager_for_location: {
        Args: { loc_id: string }
        Returns: boolean
      }
      is_org_admin: {
        Args: { p_org: string }
        Returns: boolean
      }
      is_platform_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      job_tag_id_by_name: {
        Args: { p_name: string }
        Returns: string
      }
      jwt: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      jwt_has_permission: {
        Args: { perm: string }
        Returns: boolean
      }
      org_dashboard_stats: {
        Args: { p_org_id: string }
        Returns: Json
      }
      organization_bootstrap: {
        Args: {
          p_location_name?: string
          p_org_name?: string
          p_user_id: string
        }
        Returns: Json
      }
      permission_id_by_name: {
        Args: { p_name: string }
        Returns: string
      }
      platform_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      platform_audit_recent: {
        Args: { p_limit?: number }
        Returns: {
          created_at: string
          event_key: string
          id: number
          org_id: string
          payload: Json
          user_id: string
        }[]
      }
      platform_org_counts: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      platform_plans_overview: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      profile_update_self: {
        Args: {
          p_avatar_url?: string
          p_full_name?: string
          p_locale?: string
          p_marketing_opt_in?: boolean
          p_notif_prefs?: Json
          p_phone?: string
          p_timezone?: string
        }
        Returns: {
          avatar_url: string | null
          created_at: string | null
          default_location_id: string | null
          full_name: string | null
          id: string
          locale: string | null
          marketing_opt_in: boolean | null
          notif_prefs: Json | null
          org_id: string
          phone: string | null
          timezone: string | null
          updated_at: string | null
        }
      }
      rate_limit_gc: {
        Args: { p_older_than_days?: number }
        Returns: number
      }
      rate_limit_hit: {
        Args: { p_key: string; p_limit: number; p_window_seconds: number }
        Returns: boolean
      }
      set_my_default_location: {
        Args: { p_location: string }
        Returns: undefined
      }
      set_org_feature: {
        Args: {
          p_enabled: boolean
          p_feature_key: string
          p_limit_override?: Json
          p_org: string
        }
        Returns: undefined
      }
      storage_org_from_name: {
        Args: { p_name: string }
        Returns: string
      }
      storage_user_from_name: {
        Args: { p_name: string }
        Returns: string
      }
      user_has_permission: {
        Args: { p_permission: string; p_user: string }
        Returns: boolean
      }
      user_in_location: {
        Args: { p_location: string }
        Returns: boolean
      }
      user_in_org: {
        Args: { p_org: string }
        Returns: boolean
      }
      user_is_admin: {
        Args: { p_user: string }
        Returns: boolean
      }
      user_is_location_admin: {
        Args: { p_location_id: string }
        Returns: boolean
      }
      user_is_org_admin: {
        Args: { p_org: string }
        Returns: boolean
      }
      user_is_org_manager: {
        Args: { p_org: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
