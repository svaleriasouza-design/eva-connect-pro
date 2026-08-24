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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          company_id: string | null
          contact_id: string | null
          content: string | null
          created_at: string
          error_message: string | null
          external_id: string | null
          id: string
          kind: string
          send_mode: string | null
          sent_by: string | null
          sent_by_name: string | null
          status: string | null
          status_updated_at: string | null
          title: string
          whatsapp_number_id: string | null
          workspace_id: string
        }
        Insert: {
          company_id?: string | null
          contact_id?: string | null
          content?: string | null
          created_at?: string
          error_message?: string | null
          external_id?: string | null
          id?: string
          kind: string
          send_mode?: string | null
          sent_by?: string | null
          sent_by_name?: string | null
          status?: string | null
          status_updated_at?: string | null
          title: string
          whatsapp_number_id?: string | null
          workspace_id?: string
        }
        Update: {
          company_id?: string | null
          contact_id?: string | null
          content?: string | null
          created_at?: string
          error_message?: string | null
          external_id?: string | null
          id?: string
          kind?: string
          send_mode?: string | null
          sent_by?: string | null
          sent_by_name?: string | null
          status?: string | null
          status_updated_at?: string | null
          title?: string
          whatsapp_number_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_whatsapp_number_id_fkey"
            columns: ["whatsapp_number_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_numbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      cadence_settings: {
        Row: {
          afternoon_time: string
          auto_reply_enabled: boolean
          automation_enabled: boolean
          batch_size: number
          id: boolean
          last_afternoon_run_at: string | null
          last_morning_run_at: string | null
          morning_time: string
          timezone: string
          updated_at: string
          weekdays_only: boolean
          workspace_id: string
        }
        Insert: {
          afternoon_time?: string
          auto_reply_enabled?: boolean
          automation_enabled?: boolean
          batch_size?: number
          id?: boolean
          last_afternoon_run_at?: string | null
          last_morning_run_at?: string | null
          morning_time?: string
          timezone?: string
          updated_at?: string
          weekdays_only?: boolean
          workspace_id?: string
        }
        Update: {
          afternoon_time?: string
          auto_reply_enabled?: boolean
          automation_enabled?: boolean
          batch_size?: number
          id?: boolean
          last_afternoon_run_at?: string | null
          last_morning_run_at?: string | null
          morning_time?: string
          timezone?: string
          updated_at?: string
          weekdays_only?: boolean
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cadence_settings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      cadence_steps: {
        Row: {
          active: boolean
          ai_instructions: string
          created_at: string
          day: number
          script: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          active?: boolean
          ai_instructions?: string
          created_at?: string
          day: number
          script?: string
          updated_at?: string
          workspace_id?: string
        }
        Update: {
          active?: boolean
          ai_instructions?: string
          created_at?: string
          day?: number
          script?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cadence_steps_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_targets: {
        Row: {
          campaign_id: string
          contact_id: string
          created_at: string
          error_message: string | null
          external_id: string | null
          id: string
          phone_number_id: string | null
          sent_at: string | null
          status: string
          to_phone: string | null
          whatsapp_number_id: string | null
          workspace_id: string
        }
        Insert: {
          campaign_id: string
          contact_id: string
          created_at?: string
          error_message?: string | null
          external_id?: string | null
          id?: string
          phone_number_id?: string | null
          sent_at?: string | null
          status?: string
          to_phone?: string | null
          whatsapp_number_id?: string | null
          workspace_id: string
        }
        Update: {
          campaign_id?: string
          contact_id?: string
          created_at?: string
          error_message?: string | null
          external_id?: string | null
          id?: string
          phone_number_id?: string | null
          sent_at?: string | null
          status?: string
          to_phone?: string | null
          whatsapp_number_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_targets_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_targets_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_targets_whatsapp_number_id_fkey"
            columns: ["whatsapp_number_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_numbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_targets_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          batch_size: number
          body: string
          created_at: string
          created_by: string | null
          created_by_name: string | null
          failed_count: number
          finished_at: string | null
          id: string
          name: string
          number_ids: string[]
          sent_count: number
          started_at: string | null
          status: string
          strategy: string
          total_targets: number
          updated_at: string
          workspace_id: string
        }
        Insert: {
          batch_size?: number
          body: string
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          failed_count?: number
          finished_at?: string | null
          id?: string
          name: string
          number_ids?: string[]
          sent_count?: number
          started_at?: string | null
          status?: string
          strategy?: string
          total_targets?: number
          updated_at?: string
          workspace_id: string
        }
        Update: {
          batch_size?: number
          body?: string
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          failed_count?: number
          finished_at?: string | null
          id?: string
          name?: string
          number_ids?: string[]
          sent_count?: number
          started_at?: string | null
          status?: string
          strategy?: string
          total_targets?: number
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          city: string | null
          contacts_count: number
          contracts: string | null
          created_at: string
          deleted_at: string | null
          diagnosis: string | null
          email: string | null
          employees: number | null
          funnel_stage: string | null
          id: string
          import_batch_id: string | null
          last_contact_at: string | null
          last_meeting: string | null
          name: string
          next_action: string | null
          next_action_at: string | null
          next_meeting: string | null
          notes: string | null
          phone: string | null
          proposals: string | null
          renewal: string | null
          responsible: string | null
          results: string | null
          segment: string | null
          status: string | null
          trainings: string | null
          updated_at: string
          whatsapp: string | null
          workspace_id: string
        }
        Insert: {
          city?: string | null
          contacts_count?: number
          contracts?: string | null
          created_at?: string
          deleted_at?: string | null
          diagnosis?: string | null
          email?: string | null
          employees?: number | null
          funnel_stage?: string | null
          id?: string
          import_batch_id?: string | null
          last_contact_at?: string | null
          last_meeting?: string | null
          name: string
          next_action?: string | null
          next_action_at?: string | null
          next_meeting?: string | null
          notes?: string | null
          phone?: string | null
          proposals?: string | null
          renewal?: string | null
          responsible?: string | null
          results?: string | null
          segment?: string | null
          status?: string | null
          trainings?: string | null
          updated_at?: string
          whatsapp?: string | null
          workspace_id?: string
        }
        Update: {
          city?: string | null
          contacts_count?: number
          contracts?: string | null
          created_at?: string
          deleted_at?: string | null
          diagnosis?: string | null
          email?: string | null
          employees?: number | null
          funnel_stage?: string | null
          id?: string
          import_batch_id?: string | null
          last_contact_at?: string | null
          last_meeting?: string | null
          name?: string
          next_action?: string | null
          next_action_at?: string | null
          next_meeting?: string | null
          notes?: string | null
          phone?: string | null
          proposals?: string | null
          renewal?: string | null
          responsible?: string | null
          results?: string | null
          segment?: string | null
          status?: string | null
          trainings?: string | null
          updated_at?: string
          whatsapp?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "companies_import_batch_id_fkey"
            columns: ["import_batch_id"]
            isOneToOne: false
            referencedRelation: "import_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "companies_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          ai_paused: boolean
          birthdate: string | null
          bot_reason: string | null
          cadence_active: boolean
          cadence_day: number
          children: string | null
          city: string | null
          company_id: string | null
          company_name: string | null
          created_at: string
          deleted_at: string | null
          do_not_contact: boolean
          email: string | null
          facebook: string | null
          funnel_stage: string
          goal: string | null
          id: string
          import_batch_id: string | null
          instagram: string | null
          is_bot: boolean
          last_contact_at: string | null
          main_pain: string | null
          name: string
          next_action: string | null
          next_action_at: string | null
          notes: string | null
          origin: string | null
          phone: string | null
          profession: string | null
          service_interest: string | null
          status: string
          updated_at: string
          website: string | null
          whatsapp: string | null
          whatsapp_number_id: string | null
          workspace_id: string
        }
        Insert: {
          ai_paused?: boolean
          birthdate?: string | null
          bot_reason?: string | null
          cadence_active?: boolean
          cadence_day?: number
          children?: string | null
          city?: string | null
          company_id?: string | null
          company_name?: string | null
          created_at?: string
          deleted_at?: string | null
          do_not_contact?: boolean
          email?: string | null
          facebook?: string | null
          funnel_stage?: string
          goal?: string | null
          id?: string
          import_batch_id?: string | null
          instagram?: string | null
          is_bot?: boolean
          last_contact_at?: string | null
          main_pain?: string | null
          name: string
          next_action?: string | null
          next_action_at?: string | null
          notes?: string | null
          origin?: string | null
          phone?: string | null
          profession?: string | null
          service_interest?: string | null
          status?: string
          updated_at?: string
          website?: string | null
          whatsapp?: string | null
          whatsapp_number_id?: string | null
          workspace_id?: string
        }
        Update: {
          ai_paused?: boolean
          birthdate?: string | null
          bot_reason?: string | null
          cadence_active?: boolean
          cadence_day?: number
          children?: string | null
          city?: string | null
          company_id?: string | null
          company_name?: string | null
          created_at?: string
          deleted_at?: string | null
          do_not_contact?: boolean
          email?: string | null
          facebook?: string | null
          funnel_stage?: string
          goal?: string | null
          id?: string
          import_batch_id?: string | null
          instagram?: string | null
          is_bot?: boolean
          last_contact_at?: string | null
          main_pain?: string | null
          name?: string
          next_action?: string | null
          next_action_at?: string | null
          notes?: string | null
          origin?: string | null
          phone?: string | null
          profession?: string | null
          service_interest?: string | null
          status?: string
          updated_at?: string
          website?: string | null
          whatsapp?: string | null
          whatsapp_number_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_import_batch_id_fkey"
            columns: ["import_batch_id"]
            isOneToOne: false
            referencedRelation: "import_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_whatsapp_number_id_fkey"
            columns: ["whatsapp_number_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_numbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      eva_scheduling_state: {
        Row: {
          awaiting_email: boolean
          awaiting_saturday: boolean
          contact_id: string
          duration_minutes: number
          online: boolean
          pending_start: string | null
          suggested: Json | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          awaiting_email?: boolean
          awaiting_saturday?: boolean
          contact_id: string
          duration_minutes?: number
          online?: boolean
          pending_start?: string | null
          suggested?: Json | null
          updated_at?: string
          workspace_id?: string
        }
        Update: {
          awaiting_email?: boolean
          awaiting_saturday?: boolean
          contact_id?: string
          duration_minutes?: number
          online?: boolean
          pending_start?: string | null
          suggested?: Json | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "eva_scheduling_state_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: true
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eva_scheduling_state_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          attendee_email: string | null
          company_id: string | null
          contact_id: string | null
          created_at: string
          duration_minutes: number
          ends_at: string | null
          google_event_id: string | null
          id: string
          kind: string
          location: string | null
          meet_link: string | null
          notes: string | null
          reminder_1h_sent_at: string | null
          reminder_24h_sent_at: string | null
          source: string
          starts_at: string
          status: string
          title: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          attendee_email?: string | null
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          duration_minutes?: number
          ends_at?: string | null
          google_event_id?: string | null
          id?: string
          kind?: string
          location?: string | null
          meet_link?: string | null
          notes?: string | null
          reminder_1h_sent_at?: string | null
          reminder_24h_sent_at?: string | null
          source?: string
          starts_at: string
          status?: string
          title: string
          updated_at?: string
          workspace_id?: string
        }
        Update: {
          attendee_email?: string | null
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          duration_minutes?: number
          ends_at?: string | null
          google_event_id?: string | null
          id?: string
          kind?: string
          location?: string | null
          meet_link?: string | null
          notes?: string | null
          reminder_1h_sent_at?: string | null
          reminder_24h_sent_at?: string | null
          source?: string
          starts_at?: string
          status?: string
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      import_batches: {
        Row: {
          created_at: string
          created_by: string | null
          created_by_name: string | null
          deleted_at: string | null
          file_name: string
          id: string
          inserted_rows: number
          total_rows: number
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          deleted_at?: string | null
          file_name: string
          id?: string
          inserted_rows?: number
          total_rows?: number
          updated_at?: string
          workspace_id?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          deleted_at?: string | null
          file_name?: string
          id?: string
          inserted_rows?: number
          total_rows?: number
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "import_batches_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      message_templates: {
        Row: {
          category: string
          content: string
          created_at: string
          id: string
          workspace_id: string
        }
        Insert: {
          category: string
          content: string
          created_at?: string
          id?: string
          workspace_id?: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_templates_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_wa_settings: {
        Row: {
          access_token: string | null
          app_secret: string | null
          created_at: string
          default_template_lang: string | null
          default_template_name: string | null
          graph_version: string | null
          id: boolean
          phone_number_id: string | null
          updated_at: string
          verify_token: string | null
          workspace_id: string
        }
        Insert: {
          access_token?: string | null
          app_secret?: string | null
          created_at?: string
          default_template_lang?: string | null
          default_template_name?: string | null
          graph_version?: string | null
          id?: boolean
          phone_number_id?: string | null
          updated_at?: string
          verify_token?: string | null
          workspace_id?: string
        }
        Update: {
          access_token?: string | null
          app_secret?: string | null
          created_at?: string
          default_template_lang?: string | null
          default_template_name?: string | null
          graph_version?: string | null
          id?: boolean
          phone_number_id?: string | null
          updated_at?: string
          verify_token?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meta_wa_settings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_access: {
        Row: {
          access_revoked: boolean
          created_at: string
          is_platform_admin: boolean
          notes: string | null
          trial_ends_at: string | null
          updated_at: string
          user_id: string
          vip: boolean
        }
        Insert: {
          access_revoked?: boolean
          created_at?: string
          is_platform_admin?: boolean
          notes?: string | null
          trial_ends_at?: string | null
          updated_at?: string
          user_id: string
          vip?: boolean
        }
        Update: {
          access_revoked?: boolean
          created_at?: string
          is_platform_admin?: boolean
          notes?: string | null
          trial_ends_at?: string | null
          updated_at?: string
          user_id?: string
          vip?: boolean
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      saturday_requests: {
        Row: {
          contact_id: string
          contact_name: string | null
          created_at: string
          decided_at: string | null
          decided_by: string | null
          decided_by_name: string | null
          duration_minutes: number
          id: string
          online: boolean
          phone: string | null
          start_at: string
          status: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          contact_id: string
          contact_name?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decided_by_name?: string | null
          duration_minutes?: number
          id?: string
          online?: boolean
          phone?: string | null
          start_at: string
          status?: string
          updated_at?: string
          workspace_id?: string
        }
        Update: {
          contact_id?: string
          contact_name?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decided_by_name?: string | null
          duration_minutes?: number
          id?: string
          online?: boolean
          phone?: string | null
          start_at?: string
          status?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saturday_requests_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saturday_requests_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_webhook_events: {
        Row: {
          environment: string
          event_id: string
          event_type: string
          received_at: string
        }
        Insert: {
          environment: string
          event_id: string
          event_type: string
          received_at?: string
        }
        Update: {
          environment?: string
          event_id?: string
          event_type?: string
          received_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          environment: string
          id: string
          price_id: string | null
          product_id: string | null
          status: string
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          price_id?: string | null
          product_id?: string | null
          status?: string
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          price_id?: string | null
          product_id?: string | null
          status?: string
          stripe_customer_id?: string
          stripe_subscription_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          contact_id: string | null
          created_at: string
          description: string | null
          done: boolean
          due_at: string | null
          id: string
          priority: string
          title: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          description?: string | null
          done?: boolean
          due_at?: string | null
          id?: string
          priority?: string
          title: string
          updated_at?: string
          workspace_id?: string
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          description?: string | null
          done?: boolean
          due_at?: string | null
          id?: string
          priority?: string
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
          workspace_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_numbers: {
        Row: {
          access_token: string | null
          active: boolean
          app_secret: string | null
          connected_at: string | null
          connection_error: string | null
          connection_status: string
          created_at: string
          default_template_lang: string
          default_template_name: string
          display_phone: string | null
          graph_version: string
          id: string
          is_primary: boolean
          label: string
          last_checked_at: string | null
          phone_number_id: string
          updated_at: string
          verify_token: string | null
          waba_id: string | null
          workspace_id: string
        }
        Insert: {
          access_token?: string | null
          active?: boolean
          app_secret?: string | null
          connected_at?: string | null
          connection_error?: string | null
          connection_status?: string
          created_at?: string
          default_template_lang?: string
          default_template_name?: string
          display_phone?: string | null
          graph_version?: string
          id?: string
          is_primary?: boolean
          label: string
          last_checked_at?: string | null
          phone_number_id: string
          updated_at?: string
          verify_token?: string | null
          waba_id?: string | null
          workspace_id: string
        }
        Update: {
          access_token?: string | null
          active?: boolean
          app_secret?: string | null
          connected_at?: string | null
          connection_error?: string | null
          connection_status?: string
          created_at?: string
          default_template_lang?: string
          default_template_name?: string
          display_phone?: string | null
          graph_version?: string
          id?: string
          is_primary?: boolean
          label?: string
          last_checked_at?: string | null
          phone_number_id?: string
          updated_at?: string
          verify_token?: string | null
          waba_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_numbers_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_settings: {
        Row: {
          created_at: string
          id: boolean
          name: string
          owner_name: string | null
          tagline: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: boolean
          name?: string
          owner_name?: string | null
          tagline?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Update: {
          created_at?: string
          id?: boolean
          name?: string
          owner_name?: string | null
          tagline?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_settings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_user_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string
          owner_user_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_user_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_workspace_id: { Args: never; Returns: string }
      delete_contacts: { Args: { p_ids: string[] }; Returns: number }
      funnel_stage_rank: { Args: { stage: string }; Returns: number }
      has_active_subscription: {
        Args: { check_env?: string; user_uuid: string }
        Returns: boolean
      }
      has_app_access: {
        Args: { _user_id: string; check_env?: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_platform_admin: { Args: { _user_id: string }; Returns: boolean }
      norm_company_name: { Args: { txt: string }; Returns: string }
      recompute_company_aggregates: {
        Args: { _company_id: string }
        Returns: undefined
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      unaccent: { Args: { "": string }; Returns: string }
      workspace_owner_for_user: { Args: { _user_id: string }; Returns: string }
    }
    Enums: {
      app_role: "admin" | "operador" | "leitor"
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
    Enums: {
      app_role: ["admin", "operador", "leitor"],
    },
  },
} as const
