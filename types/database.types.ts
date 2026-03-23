export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      argument_statements: {
        Row: {
          argument_id: string
          created_at: string | null
          id: string
          statement_id: string
        }
        Insert: {
          argument_id: string
          created_at?: string | null
          id?: string
          statement_id: string
        }
        Update: {
          argument_id?: string
          created_at?: string | null
          id?: string
          statement_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "argument_statements_argument_id_fkey"
            columns: ["argument_id"]
            isOneToOne: false
            referencedRelation: "arguments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "argument_statements_statement_id_fkey"
            columns: ["statement_id"]
            isOneToOne: false
            referencedRelation: "statements"
            referencedColumns: ["id"]
          },
        ]
      }
      arguments: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string
          id: string
          subject_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description: string
          id?: string
          subject_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string
          id?: string
          subject_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "arguments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "contributors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arguments_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arguments_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "v_subject_activity_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      contributors: {
        Row: {
          created_at: string | null
          id: string
          reputation: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id: string
          reputation?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          reputation?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      draft_statements: {
        Row: {
          ai_notes: string | null
          created_at: string
          date: string
          id: string
          origin: string
          position_data: Json | null
          position_title: string
          public_figure_data: Json | null
          public_figure_name: string
          quote: string
          rejection_note: string | null
          source_name: string
          source_url: string
          status: string
          subject_data: Json | null
          subject_title: string
          updated_at: string
        }
        Insert: {
          ai_notes?: string | null
          created_at?: string
          date: string
          id?: string
          origin: string
          position_data?: Json | null
          position_title: string
          public_figure_data?: Json | null
          public_figure_name: string
          quote: string
          rejection_note?: string | null
          source_name: string
          source_url: string
          status?: string
          subject_data?: Json | null
          subject_title: string
          updated_at?: string
        }
        Update: {
          ai_notes?: string | null
          created_at?: string
          date?: string
          id?: string
          origin?: string
          position_data?: Json | null
          position_title?: string
          public_figure_data?: Json | null
          public_figure_name?: string
          quote?: string
          rejection_note?: string | null
          source_name?: string
          source_url?: string
          status?: string
          subject_data?: Json | null
          subject_title?: string
          updated_at?: string
        }
        Relationships: []
      }
      invitations: {
        Row: {
          created_at: string | null
          id: string
          invitee_email: string
          invitee_id: string | null
          invitee_name: string
          inviter_id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          invitee_email: string
          invitee_id?: string | null
          invitee_name: string
          inviter_id: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          invitee_email?: string
          invitee_id?: string | null
          invitee_name?: string
          inviter_id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invitations_invitee_id_fkey"
            columns: ["invitee_id"]
            isOneToOne: false
            referencedRelation: "contributors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_inviter_id_fkey"
            columns: ["inviter_id"]
            isOneToOne: false
            referencedRelation: "contributors"
            referencedColumns: ["id"]
          },
        ]
      }
      positions: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string
          id: string
          subject_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description: string
          id?: string
          subject_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string
          id?: string
          subject_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "positions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "contributors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "positions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "positions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "v_subject_activity_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      public_figures: {
        Row: {
          created_at: string | null
          created_by: string
          id: string
          name: string
          notoriety_sources: string[] | null
          presentation: string
          slug: string
          updated_at: string | null
          website_url: string | null
          wikipedia_url: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          id?: string
          name: string
          notoriety_sources?: string[] | null
          presentation: string
          slug: string
          updated_at?: string | null
          website_url?: string | null
          wikipedia_url?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          id?: string
          name?: string
          notoriety_sources?: string[] | null
          presentation?: string
          slug?: string
          updated_at?: string | null
          website_url?: string | null
          wikipedia_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "public_figures_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "contributors"
            referencedColumns: ["id"]
          },
        ]
      }
      reputation_events: {
        Row: {
          action: string
          amount: number
          contributor_id: string
          created_at: string | null
          id: string
          related_entity_id: string | null
          related_entity_type: string | null
        }
        Insert: {
          action: string
          amount: number
          contributor_id: string
          created_at?: string | null
          id?: string
          related_entity_id?: string | null
          related_entity_type?: string | null
        }
        Update: {
          action?: string
          amount?: number
          contributor_id?: string
          created_at?: string | null
          id?: string
          related_entity_id?: string | null
          related_entity_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reputation_events_contributor_id_fkey"
            columns: ["contributor_id"]
            isOneToOne: false
            referencedRelation: "contributors"
            referencedColumns: ["id"]
          },
        ]
      }
      statements: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          position_id: string
          public_figure_id: string
          quote: string
          source_name: string
          source_url: string | null
          stated_at: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          position_id: string
          public_figure_id: string
          quote: string
          source_name: string
          source_url?: string | null
          stated_at: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          position_id?: string
          public_figure_id?: string
          quote?: string
          source_name?: string
          source_url?: string | null
          stated_at?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "statements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "contributors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "statements_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "statements_public_figure_id_fkey"
            columns: ["public_figure_id"]
            isOneToOne: false
            referencedRelation: "public_figures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "statements_public_figure_id_fkey"
            columns: ["public_figure_id"]
            isOneToOne: false
            referencedRelation: "v_public_figure_activity_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          picture_url: string | null
          presentation: string
          problem: string
          slug: string
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          picture_url?: string | null
          presentation: string
          problem: string
          slug: string
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          picture_url?: string | null
          presentation?: string
          problem?: string
          slug?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subjects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "contributors"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_public_figure_activity_summary: {
        Row: {
          id: string | null
          latest_statement_at: string | null
          name: string | null
          presentation: string | null
          slug: string | null
          statements_count: number | null
          subjects_count: number | null
        }
        Relationships: []
      }
      v_subject_activity_summary: {
        Row: {
          created_at: string | null
          created_by: string | null
          figures: Json | null
          id: string | null
          latest_statement_at: string | null
          picture_url: string | null
          positions_count: number | null
          presentation: string | null
          problem: string | null
          public_figures_count: number | null
          slug: string | null
          statements_count: number | null
          title: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subjects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "contributors"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      get_user_id_by_email: { Args: { target_email: string }; Returns: string }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

