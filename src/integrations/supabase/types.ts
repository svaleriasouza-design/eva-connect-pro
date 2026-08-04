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
          external_id: string | null
          id: string
          kind: string
          send_mode: string | null
          sent_by: string | null
          sent_by_name: string | null
          status: string | null
          status_updated_at: string | null
          title: string
          workspace_id: string
        }
        Insert: {
          company_id?: string | null
          contact_id?: string | null
          content?: string | null
          created_at?: string
          external_id?: string | null
          id?: string
          kind: string
          send_mode?: string | null
          sent_by?: string | null
          sent_by_name?: string | null
          status?: string | null
          status_updated_at?: string | null
          title: string
          workspace_id?: string
        }
        Update: {
          company_id?: string | null
          contact_id?: string | null
          content?: string | null
          created_at?: string
          external_id?: string | null
          id?: string
          kind?: string
          send_mode?: string | null
          sent_by?: string | null
          sent_by_name?: string | null
          status?: string | null
          status_updated_at?: string | null
          title?: string
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
      companies: {
        Row: {
          city: string | null
          contacts_count: number
          contracts: string | null
          created_at: string
          diagnosis: string | null
          email: string | null
          employees: number | null
          funnel_stage: string | null
          id: string
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
          diagnosis?: string | null
          email?: string | null
          employees?: number | null
          funnel_stage?: string | null
          id?: string
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
          diagnosis?: string | null
          email?: string | null
          employees?: number | null
          funnel_stage?: string | null
          id?: string
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
          do_not_contact: boolean
          email: string | null
          facebook: string | null
          funnel_stage: string
          goal: string | null
          id: string
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
          do_not_contact?: boolean
          email?: string | null
          facebook?: string | null
          funnel_stage?: string
          goal?: string | null
          id?: string
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
          do_not_contact?: boolean
          email?: string | null
          facebook?: string | null
          funnel_stage?: string
          goal?: string | null
          id?: string
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
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
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
      funnel_stage_rank: { Args: { stage: string }; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      norm_company_name: { Args: { txt: string }; Returns: string }
      recompute_company_aggregates: {
        Args: { _company_id: string }
        Returns: undefined
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      unaccent: { Args: { "": string }; Returns: string }
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
