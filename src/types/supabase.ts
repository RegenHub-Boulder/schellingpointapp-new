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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      cohost_invites: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string | null
          created_by: string
          event_id: string
          expires_at: string
          id: string
          session_id: string
          status: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string | null
          created_by: string
          event_id: string
          expires_at?: string
          id?: string
          session_id: string
          status?: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string | null
          created_by?: string
          event_id?: string
          expires_at?: string
          id?: string
          session_id?: string
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "cohost_invites_accepted_by_fkey"
            columns: ["accepted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cohost_invites_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cohost_invites_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cohost_invites_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      event_members: {
        Row: {
          event_id: string
          id: string
          joined_at: string | null
          role: string
          user_id: string
          vote_credits: number | null
        }
        Insert: {
          event_id: string
          id?: string
          joined_at?: string | null
          role?: string
          user_id: string
          vote_credits?: number | null
        }
        Update: {
          event_id?: string
          id?: string
          joined_at?: string | null
          role?: string
          user_id?: string
          vote_credits?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "event_members_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          allowed_durations: number[] | null
          allowed_formats: string[] | null
          banner_url: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          end_date: string
          favicon_url: string | null
          id: string
          is_featured: boolean | null
          location_address: string | null
          location_geo: unknown
          location_name: string | null
          logo_url: string | null
          max_attendees: number | null
          max_proposals_per_user: number | null
          name: string
          proposals_close_at: string | null
          proposals_open_at: string | null
          require_proposal_approval: boolean | null
          slug: string
          start_date: string
          status: string | null
          tagline: string | null
          theme: Json | null
          timezone: string
          updated_at: string | null
          visibility: string | null
          vote_credits_per_user: number | null
          voting_closes_at: string | null
          voting_opens_at: string | null
        }
        Insert: {
          allowed_durations?: number[] | null
          allowed_formats?: string[] | null
          banner_url?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date: string
          favicon_url?: string | null
          id?: string
          is_featured?: boolean | null
          location_address?: string | null
          location_geo?: unknown
          location_name?: string | null
          logo_url?: string | null
          max_attendees?: number | null
          max_proposals_per_user?: number | null
          name: string
          proposals_close_at?: string | null
          proposals_open_at?: string | null
          require_proposal_approval?: boolean | null
          slug: string
          start_date: string
          status?: string | null
          tagline?: string | null
          theme?: Json | null
          timezone?: string
          updated_at?: string | null
          visibility?: string | null
          vote_credits_per_user?: number | null
          voting_closes_at?: string | null
          voting_opens_at?: string | null
        }
        Update: {
          allowed_durations?: number[] | null
          allowed_formats?: string[] | null
          banner_url?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string
          favicon_url?: string | null
          id?: string
          is_featured?: boolean | null
          location_address?: string | null
          location_geo?: unknown
          location_name?: string | null
          logo_url?: string | null
          max_attendees?: number | null
          max_proposals_per_user?: number | null
          name?: string
          proposals_close_at?: string | null
          proposals_open_at?: string | null
          require_proposal_approval?: boolean | null
          slug?: string
          start_date?: string
          status?: string | null
          tagline?: string | null
          theme?: Json | null
          timezone?: string
          updated_at?: string | null
          visibility?: string | null
          vote_credits_per_user?: number | null
          voting_closes_at?: string | null
          voting_opens_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string | null
          event_id: string
          id: string
          session_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          event_id: string
          id?: string
          session_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          event_id?: string
          id?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          category: string
          created_at: string
          email_enabled: boolean
          event_id: string | null
          id: string
          in_app_enabled: boolean
          push_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          email_enabled?: boolean
          event_id?: string | null
          id?: string
          in_app_enabled?: boolean
          push_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          email_enabled?: boolean
          event_id?: string | null
          id?: string
          in_app_enabled?: boolean
          push_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_url: string | null
          body: string | null
          created_at: string
          data: Json | null
          email_sent_at: string | null
          event_id: string | null
          id: string
          push_sent_at: string | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          body?: string | null
          created_at?: string
          data?: Json | null
          email_sent_at?: string | null
          event_id?: string | null
          id?: string
          push_sent_at?: string | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          body?: string | null
          created_at?: string
          data?: Json | null
          email_sent_at?: string | null
          event_id?: string | null
          id?: string
          push_sent_at?: string | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          affiliation: string | null
          avatar_url: string | null
          bio: string | null
          building: string | null
          created_at: string | null
          display_name: string | null
          email: string
          ens: string | null
          id: string
          interests: string[] | null
          is_admin: boolean | null
          onboarding_completed: boolean | null
          telegram: string | null
          vote_credits: number | null
        }
        Insert: {
          affiliation?: string | null
          avatar_url?: string | null
          bio?: string | null
          building?: string | null
          created_at?: string | null
          display_name?: string | null
          email: string
          ens?: string | null
          id: string
          interests?: string[] | null
          is_admin?: boolean | null
          onboarding_completed?: boolean | null
          telegram?: string | null
          vote_credits?: number | null
        }
        Update: {
          affiliation?: string | null
          avatar_url?: string | null
          bio?: string | null
          building?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: string
          ens?: string | null
          id?: string
          interests?: string[] | null
          is_admin?: boolean | null
          onboarding_completed?: boolean | null
          telegram?: string | null
          vote_credits?: number | null
        }
        Relationships: []
      }
      session_cohosts: {
        Row: {
          added_at: string | null
          display_order: number | null
          event_id: string
          id: string
          session_id: string
          user_id: string
        }
        Insert: {
          added_at?: string | null
          display_order?: number | null
          event_id: string
          id?: string
          session_id: string
          user_id: string
        }
        Update: {
          added_at?: string | null
          display_order?: number | null
          event_id?: string
          id?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_cohosts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_cohosts_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_cohosts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          created_at: string | null
          custom_location: string | null
          description: string | null
          duration: number | null
          event_id: string
          format: string | null
          host_id: string | null
          host_name: string | null
          host_notified_at: string | null
          id: string
          is_self_hosted: boolean | null
          is_votable: boolean | null
          self_hosted_end_time: string | null
          self_hosted_start_time: string | null
          session_type: string | null
          status: string | null
          telegram_group_url: string | null
          time_preferences: string[] | null
          time_slot_id: string | null
          title: string
          topic_tags: string[] | null
          total_credits: number | null
          total_votes: number | null
          track_id: string | null
          updated_at: string | null
          venue_id: string | null
          voter_count: number | null
        }
        Insert: {
          created_at?: string | null
          custom_location?: string | null
          description?: string | null
          duration?: number | null
          event_id: string
          format?: string | null
          host_id?: string | null
          host_name?: string | null
          host_notified_at?: string | null
          id?: string
          is_self_hosted?: boolean | null
          is_votable?: boolean | null
          self_hosted_end_time?: string | null
          self_hosted_start_time?: string | null
          session_type?: string | null
          status?: string | null
          telegram_group_url?: string | null
          time_preferences?: string[] | null
          time_slot_id?: string | null
          title: string
          topic_tags?: string[] | null
          total_credits?: number | null
          total_votes?: number | null
          track_id?: string | null
          updated_at?: string | null
          venue_id?: string | null
          voter_count?: number | null
        }
        Update: {
          created_at?: string | null
          custom_location?: string | null
          description?: string | null
          duration?: number | null
          event_id?: string
          format?: string | null
          host_id?: string | null
          host_name?: string | null
          host_notified_at?: string | null
          id?: string
          is_self_hosted?: boolean | null
          is_votable?: boolean | null
          self_hosted_end_time?: string | null
          self_hosted_start_time?: string | null
          session_type?: string | null
          status?: string | null
          telegram_group_url?: string | null
          time_preferences?: string[] | null
          time_slot_id?: string | null
          title?: string
          topic_tags?: string[] | null
          total_credits?: number | null
          total_votes?: number | null
          track_id?: string | null
          updated_at?: string | null
          venue_id?: string | null
          voter_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sessions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_time_slot_id_fkey"
            columns: ["time_slot_id"]
            isOneToOne: false
            referencedRelation: "time_slots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      time_slots: {
        Row: {
          created_at: string | null
          day_date: string | null
          end_time: string
          event_id: string
          id: string
          is_break: boolean | null
          label: string | null
          slot_type: string | null
          start_time: string
          venue_id: string | null
        }
        Insert: {
          created_at?: string | null
          day_date?: string | null
          end_time: string
          event_id: string
          id?: string
          is_break?: boolean | null
          label?: string | null
          slot_type?: string | null
          start_time: string
          venue_id?: string | null
        }
        Update: {
          created_at?: string | null
          day_date?: string | null
          end_time?: string
          event_id?: string
          id?: string
          is_break?: boolean | null
          label?: string | null
          slot_type?: string | null
          start_time?: string
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "time_slots_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_slots_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      tracks: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          display_order: number | null
          event_id: string
          id: string
          is_active: boolean | null
          lead_email: string | null
          lead_name: string | null
          lead_user_id: string | null
          max_sessions: number | null
          name: string
          slug: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          event_id: string
          id?: string
          is_active?: boolean | null
          lead_email?: string | null
          lead_name?: string | null
          lead_user_id?: string | null
          max_sessions?: number | null
          name: string
          slug: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          event_id?: string
          id?: string
          is_active?: boolean | null
          lead_email?: string | null
          lead_name?: string | null
          lead_user_id?: string | null
          max_sessions?: number | null
          name?: string
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "tracks_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tracks_lead_user_id_fkey"
            columns: ["lead_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      venues: {
        Row: {
          address: string | null
          capacity: number | null
          created_at: string | null
          event_id: string
          features: string[] | null
          id: string
          is_primary: boolean | null
          name: string
          notes: string | null
          slug: string | null
          style: string | null
        }
        Insert: {
          address?: string | null
          capacity?: number | null
          created_at?: string | null
          event_id: string
          features?: string[] | null
          id?: string
          is_primary?: boolean | null
          name: string
          notes?: string | null
          slug?: string | null
          style?: string | null
        }
        Update: {
          address?: string | null
          capacity?: number | null
          created_at?: string | null
          event_id?: string
          features?: string[] | null
          id?: string
          is_primary?: boolean | null
          name?: string
          notes?: string | null
          slug?: string | null
          style?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "venues_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      votes: {
        Row: {
          created_at: string | null
          credits_spent: number
          event_id: string
          id: string
          session_id: string
          updated_at: string | null
          user_id: string
          vote_count: number
        }
        Insert: {
          created_at?: string | null
          credits_spent: number
          event_id: string
          id?: string
          session_id: string
          updated_at?: string | null
          user_id: string
          vote_count: number
        }
        Update: {
          created_at?: string | null
          credits_spent?: number
          event_id?: string
          id?: string
          session_id?: string
          updated_at?: string | null
          user_id?: string
          vote_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "votes_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_notification_category: {
        Args: { notification_type: string }
        Returns: string
      }
      should_send_notification: {
        Args: {
          p_channel: string
          p_event_id: string
          p_type: string
          p_user_id: string
        }
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
