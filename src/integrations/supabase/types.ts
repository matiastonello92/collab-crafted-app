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
      availability: {
        Row: {
          created_at: string
          id: string
          location_id: string
          org_id: string
          preference: string
          time_range: unknown
          updated_at: string
          user_id: string
          weekday: number
        }
        Insert: {
          created_at?: string
          id?: string
          location_id: string
          org_id: string
          preference?: string
          time_range: unknown
          updated_at?: string
          user_id: string
          weekday: number
        }
        Update: {
          created_at?: string
          id?: string
          location_id?: string
          org_id?: string
          preference?: string
          time_range?: unknown
          updated_at?: string
          user_id?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "availability_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "availability_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "my_accessible_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "availability_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "availability_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_rules: {
        Row: {
          created_at: string
          description: string | null
          display_name: string
          id: string
          is_active: boolean
          org_id: string
          rule_key: string
          threshold_value: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_name: string
          id?: string
          is_active?: boolean
          org_id: string
          rule_key: string
          threshold_value?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_name?: string
          id?: string
          is_active?: boolean
          org_id?: string
          rule_key?: string
          threshold_value?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_rules_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["org_id"]
          },
        ]
      }
      compliance_violations: {
        Row: {
          created_at: string
          details: Json
          id: string
          is_silenced: boolean
          location_id: string
          org_id: string
          rule_id: string
          severity: string
          silence_reason: string | null
          silenced_at: string | null
          silenced_by: string | null
          user_id: string
          violation_date: string
        }
        Insert: {
          created_at?: string
          details?: Json
          id?: string
          is_silenced?: boolean
          location_id: string
          org_id: string
          rule_id: string
          severity?: string
          silence_reason?: string | null
          silenced_at?: string | null
          silenced_by?: string | null
          user_id: string
          violation_date: string
        }
        Update: {
          created_at?: string
          details?: Json
          id?: string
          is_silenced?: boolean
          location_id?: string
          org_id?: string
          rule_id?: string
          severity?: string
          silence_reason?: string | null
          silenced_at?: string | null
          silenced_by?: string | null
          user_id?: string
          violation_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_violations_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_violations_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "my_accessible_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_violations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "compliance_violations_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "compliance_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      email_logs: {
        Row: {
          created_at: string
          email_type: string
          error_message: string | null
          id: string
          metadata: Json | null
          org_id: string
          provider_id: string | null
          recipient_email: string
          sent_at: string | null
          status: string
          subject: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email_type: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          org_id: string
          provider_id?: string | null
          recipient_email: string
          sent_at?: string | null
          status?: string
          subject: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email_type?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          org_id?: string
          provider_id?: string | null
          recipient_email?: string
          sent_at?: string | null
          status?: string
          subject?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["org_id"]
          },
        ]
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
      inventory_catalog_items: {
        Row: {
          category: string
          created_at: string
          created_by: string
          default_unit_price: number
          id: string
          is_active: boolean
          location_id: string
          name: string
          org_id: string
          photo_url: string | null
          product_category: string | null
          supplier_id: string | null
          uom: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          created_by?: string
          default_unit_price?: number
          id?: string
          is_active?: boolean
          location_id: string
          name: string
          org_id: string
          photo_url?: string | null
          product_category?: string | null
          supplier_id?: string | null
          uom: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string
          default_unit_price?: number
          id?: string
          is_active?: boolean
          location_id?: string
          name?: string
          org_id?: string
          photo_url?: string | null
          product_category?: string | null
          supplier_id?: string | null
          uom?: string
          updated_at?: string
        }
        Relationships: []
      }
      inventory_headers: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          category: string
          creation_mode: string | null
          id: string
          location_id: string
          notes: string | null
          org_id: string
          started_at: string
          started_by: string
          status: string
          template_id: string | null
          template_version: number | null
          total_value: number
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          category: string
          creation_mode?: string | null
          id?: string
          location_id: string
          notes?: string | null
          org_id: string
          started_at?: string
          started_by: string
          status?: string
          template_id?: string | null
          template_version?: number | null
          total_value?: number
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          category?: string
          creation_mode?: string | null
          id?: string
          location_id?: string
          notes?: string | null
          org_id?: string
          started_at?: string
          started_by?: string
          status?: string
          template_id?: string | null
          template_version?: number | null
          total_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "inventory_headers_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "inventory_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_lines: {
        Row: {
          catalog_item_id: string
          header_id: string
          id: string
          line_value: number
          location_id: string
          name_snapshot: string
          org_id: string
          qty: number
          unit_price_snapshot: number
          uom_snapshot: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          catalog_item_id: string
          header_id: string
          id?: string
          line_value?: number
          location_id: string
          name_snapshot: string
          org_id: string
          qty?: number
          unit_price_snapshot: number
          uom_snapshot: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          catalog_item_id?: string
          header_id?: string
          id?: string
          line_value?: number
          location_id?: string
          name_snapshot?: string
          org_id?: string
          qty?: number
          unit_price_snapshot?: number
          uom_snapshot?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_lines_catalog_item_id_fkey"
            columns: ["catalog_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_catalog_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_lines_header_id_fkey"
            columns: ["header_id"]
            isOneToOne: false
            referencedRelation: "inventory_headers"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_presence: {
        Row: {
          header_id: string
          last_seen_at: string
          user_id: string
        }
        Insert: {
          header_id: string
          last_seen_at?: string
          user_id: string
        }
        Update: {
          header_id?: string
          last_seen_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_presence_header_id_fkey"
            columns: ["header_id"]
            isOneToOne: false
            referencedRelation: "inventory_headers"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_template_items: {
        Row: {
          catalog_item_id: string
          created_at: string
          id: string
          location_id: string
          org_id: string
          section: string | null
          sort_order: number
          template_id: string
          unit_price_override: number | null
          uom_override: string | null
        }
        Insert: {
          catalog_item_id: string
          created_at?: string
          id?: string
          location_id: string
          org_id: string
          section?: string | null
          sort_order?: number
          template_id: string
          unit_price_override?: number | null
          uom_override?: string | null
        }
        Update: {
          catalog_item_id?: string
          created_at?: string
          id?: string
          location_id?: string
          org_id?: string
          section?: string | null
          sort_order?: number
          template_id?: string
          unit_price_override?: number | null
          uom_override?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_template_items_catalog_item_id_fkey"
            columns: ["catalog_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_catalog_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_template_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "inventory_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_templates: {
        Row: {
          category: string
          created_at: string
          created_by: string
          id: string
          is_active: boolean
          location_id: string
          name: string
          org_id: string
          updated_at: string
          version: number
        }
        Insert: {
          category: string
          created_at?: string
          created_by: string
          id?: string
          is_active?: boolean
          location_id: string
          name: string
          org_id: string
          updated_at?: string
          version?: number
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean
          location_id?: string
          name?: string
          org_id?: string
          updated_at?: string
          version?: number
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
          categoria: string | null
          color: string | null
          created_at: string
          id: string
          is_active: boolean
          key: string
          label_it: string
          org_id: string
          updated_at: string
        }
        Insert: {
          categoria?: string | null
          color?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          key: string
          label_it: string
          org_id: string
          updated_at?: string
        }
        Update: {
          categoria?: string | null
          color?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          key?: string
          label_it?: string
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
      leave_requests: {
        Row: {
          approved_at: string | null
          approver_id: string | null
          converted_to_leave_id: string | null
          created_at: string
          end_at: string
          id: string
          location_id: string
          notes: string | null
          org_id: string
          reason: string | null
          start_at: string
          status: string
          type_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approver_id?: string | null
          converted_to_leave_id?: string | null
          created_at?: string
          end_at: string
          id?: string
          location_id: string
          notes?: string | null
          org_id: string
          reason?: string | null
          start_at: string
          status?: string
          type_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approver_id?: string | null
          converted_to_leave_id?: string | null
          created_at?: string
          end_at?: string
          id?: string
          location_id?: string
          notes?: string | null
          org_id?: string
          reason?: string | null
          start_at?: string
          status?: string
          type_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_approver_id_fkey"
            columns: ["approver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_converted_to_leave_id_fkey"
            columns: ["converted_to_leave_id"]
            isOneToOne: false
            referencedRelation: "leaves"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "my_accessible_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "leave_requests_type_id_fkey"
            columns: ["type_id"]
            isOneToOne: false
            referencedRelation: "leave_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_types: {
        Row: {
          color: string | null
          created_at: string
          id: string
          is_active: boolean
          key: string
          label: string
          org_id: string
          requires_approval: boolean
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          key: string
          label: string
          org_id: string
          requires_approval?: boolean
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          key?: string
          label?: string
          org_id?: string
          requires_approval?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_types_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["org_id"]
          },
        ]
      }
      leaves: {
        Row: {
          created_at: string
          created_by: string
          created_from_request_id: string | null
          end_at: string
          id: string
          location_id: string
          notes: string | null
          org_id: string
          reason: string | null
          start_at: string
          type_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          created_from_request_id?: string | null
          end_at: string
          id?: string
          location_id: string
          notes?: string | null
          org_id: string
          reason?: string | null
          start_at: string
          type_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          created_from_request_id?: string | null
          end_at?: string
          id?: string
          location_id?: string
          notes?: string | null
          org_id?: string
          reason?: string | null
          start_at?: string
          type_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leaves_created_from_request_id_fkey"
            columns: ["created_from_request_id"]
            isOneToOne: false
            referencedRelation: "leave_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leaves_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leaves_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "my_accessible_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leaves_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "leaves_type_id_fkey"
            columns: ["type_id"]
            isOneToOne: false
            referencedRelation: "leave_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leaves_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
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
          email: string | null
          email_preferences: Json | null
          full_name: string | null
          id: string
          locale: string | null
          marketing_opt_in: boolean | null
          notif_prefs: Json | null
          org_id: string
          phone: string | null
          pin_code: string | null
          timezone: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          default_location_id?: string | null
          email?: string | null
          email_preferences?: Json | null
          full_name?: string | null
          id: string
          locale?: string | null
          marketing_opt_in?: boolean | null
          notif_prefs?: Json | null
          org_id: string
          phone?: string | null
          pin_code?: string | null
          timezone?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          default_location_id?: string | null
          email?: string | null
          email_preferences?: Json | null
          full_name?: string | null
          id?: string
          locale?: string | null
          marketing_opt_in?: boolean | null
          notif_prefs?: Json | null
          org_id?: string
          phone?: string | null
          pin_code?: string | null
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
      rotas: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          labor_budget_eur: number | null
          location_id: string
          org_id: string
          status: string
          updated_at: string
          updated_by: string | null
          week_start_date: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          labor_budget_eur?: number | null
          location_id: string
          org_id: string
          status?: string
          updated_at?: string
          updated_by?: string | null
          week_start_date: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          labor_budget_eur?: number | null
          location_id?: string
          org_id?: string
          status?: string
          updated_at?: string
          updated_by?: string | null
          week_start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "rotas_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rotas_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "my_accessible_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rotas_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "rotas_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_assignments: {
        Row: {
          acknowledged_at: string | null
          assigned_at: string | null
          created_at: string
          id: string
          proposed_at: string | null
          published_at: string | null
          shift_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          assigned_at?: string | null
          created_at?: string
          id?: string
          proposed_at?: string | null
          published_at?: string | null
          shift_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          acknowledged_at?: string | null
          assigned_at?: string | null
          created_at?: string
          id?: string
          proposed_at?: string | null
          published_at?: string | null
          shift_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_assignments_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_template_items: {
        Row: {
          break_minutes: number
          created_at: string
          end_time: string
          id: string
          job_tag_id: string | null
          location_id: string
          notes: string | null
          org_id: string
          sort_order: number
          start_time: string
          template_id: string
          weekday: number
        }
        Insert: {
          break_minutes?: number
          created_at?: string
          end_time: string
          id?: string
          job_tag_id?: string | null
          location_id: string
          notes?: string | null
          org_id: string
          sort_order?: number
          start_time: string
          template_id: string
          weekday: number
        }
        Update: {
          break_minutes?: number
          created_at?: string
          end_time?: string
          id?: string
          job_tag_id?: string | null
          location_id?: string
          notes?: string | null
          org_id?: string
          sort_order?: number
          start_time?: string
          template_id?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "shift_template_items_job_tag_id_fkey"
            columns: ["job_tag_id"]
            isOneToOne: false
            referencedRelation: "job_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_template_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "shift_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_templates: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_active: boolean
          location_id: string
          name: string
          org_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean
          location_id: string
          name: string
          org_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean
          location_id?: string
          name?: string
          org_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_templates_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_templates_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "my_accessible_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_templates_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["org_id"]
          },
        ]
      }
      shifts: {
        Row: {
          break_minutes: number
          created_at: string
          created_by: string | null
          end_at: string
          id: string
          job_tag_id: string | null
          location_id: string
          notes: string | null
          org_id: string
          rota_id: string
          start_at: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          break_minutes?: number
          created_at?: string
          created_by?: string | null
          end_at: string
          id?: string
          job_tag_id?: string | null
          location_id: string
          notes?: string | null
          org_id: string
          rota_id: string
          start_at: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          break_minutes?: number
          created_at?: string
          created_by?: string | null
          end_at?: string
          id?: string
          job_tag_id?: string | null
          location_id?: string
          notes?: string | null
          org_id?: string
          rota_id?: string
          start_at?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shifts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_job_tag_id_fkey"
            columns: ["job_tag_id"]
            isOneToOne: false
            referencedRelation: "job_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "my_accessible_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "shifts_rota_id_fkey"
            columns: ["rota_id"]
            isOneToOne: false
            referencedRelation: "rotas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
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
      time_clock_events: {
        Row: {
          created_at: string
          id: string
          kind: string
          kiosk_token: string | null
          location_id: string
          meta: Json
          occurred_at: string
          org_id: string
          source: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          kiosk_token?: string | null
          location_id: string
          meta?: Json
          occurred_at: string
          org_id: string
          source?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          kiosk_token?: string | null
          location_id?: string
          meta?: Json
          occurred_at?: string
          org_id?: string
          source?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_clock_events_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_clock_events_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "my_accessible_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_clock_events_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "time_clock_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      time_correction_requests: {
        Row: {
          created_at: string
          event_id: string | null
          id: string
          location_id: string
          org_id: string
          original_time: string | null
          reason: string
          requested_time: string
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_notes: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id?: string | null
          id?: string
          location_id: string
          org_id: string
          original_time?: string | null
          reason: string
          requested_time: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string | null
          id?: string
          location_id?: string
          org_id?: string
          original_time?: string | null
          reason?: string
          requested_time?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_correction_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "time_clock_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_correction_requests_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_correction_requests_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "my_accessible_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_correction_requests_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["org_id"]
          },
        ]
      }
      timesheets: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          id: string
          org_id: string
          period_end: string
          period_start: string
          totals: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          org_id: string
          period_end: string
          period_start: string
          totals?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          org_id?: string
          period_end?: string
          period_start?: string
          totals?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "timesheets_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheets_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "timesheets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_job_tags: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          id: string
          is_primary: boolean | null
          job_tag_id: string
          location_id: string
          note: string | null
          org_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          is_primary?: boolean | null
          job_tag_id: string
          location_id: string
          note?: string | null
          org_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          is_primary?: boolean | null
          job_tag_id?: string
          location_id?: string
          note?: string | null
          org_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_job_tags_job_tag_id_fkey"
            columns: ["job_tag_id"]
            isOneToOne: false
            referencedRelation: "job_tags"
            referencedColumns: ["id"]
          },
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
      calculate_header_total: {
        Args: { p_header_id: string }
        Returns: number
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
      generate_job_tag_key: {
        Args: { p_label: string }
        Returns: string
      }
      get_active_plan_id: {
        Args: { p_org: string }
        Returns: string
      }
      get_my_default_location: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_users_for_location: {
        Args: { p_location_id?: string; p_org_id?: string }
        Returns: {
          full_name: string
          id: string
          org_id: string
        }[]
      }
      insert_preset_ristorazione_tags: {
        Args: { p_org_id: string }
        Returns: Json
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
          email: string | null
          email_preferences: Json | null
          full_name: string | null
          id: string
          locale: string | null
          marketing_opt_in: boolean | null
          notif_prefs: Json | null
          org_id: string
          phone: string | null
          pin_code: string | null
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
      user_can_manage_inventory: {
        Args: { p_location_id: string; p_org_id: string }
        Returns: boolean
      }
      user_can_view_shift_assignment: {
        Args: { _shift_id: string }
        Returns: boolean
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
