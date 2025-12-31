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
      generated_content: {
        Row: {
          content: string
          created_at: string
          id: string
          prompt: string
          type: string
          updated_at: string
          user_id: string
          work_entry_ids: string[] | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          prompt: string
          type?: string
          updated_at?: string
          user_id: string
          work_entry_ids?: string[] | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          prompt?: string
          type?: string
          updated_at?: string
          user_id?: string
          work_entry_ids?: string[] | null
        }
        Relationships: []
      }
      log_conversations: {
        Row: {
          created_at: string
          id: string
          messages: Json
          status: string
          user_id: string
          work_entry_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          messages?: Json
          status?: string
          user_id: string
          work_entry_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          messages?: Json
          status?: string
          user_id?: string
          work_entry_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "log_conversations_work_entry_id_fkey"
            columns: ["work_entry_id"]
            isOneToOne: false
            referencedRelation: "work_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          employment_status: string | null
          id: string
          industry: string | null
          study_field: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          employment_status?: string | null
          id?: string
          industry?: string | null
          study_field?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          employment_status?: string | null
          id?: string
          industry?: string | null
          study_field?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      target_documents: {
        Row: {
          created_at: string | null
          document_type: string | null
          file_name: string
          file_path: string
          id: string
          parsed_content: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          document_type?: string | null
          file_name: string
          file_path: string
          id?: string
          parsed_content?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          document_type?: string | null
          file_name?: string
          file_path?: string
          id?: string
          parsed_content?: string | null
          user_id?: string
        }
        Relationships: []
      }
      targets: {
        Row: {
          created_at: string | null
          currency_code: string | null
          current_value: number | null
          deadline: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          source_document_id: string | null
          target_value: number | null
          type: string | null
          unit: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          currency_code?: string | null
          current_value?: number | null
          deadline?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          source_document_id?: string | null
          target_value?: number | null
          type?: string | null
          unit?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          currency_code?: string | null
          current_value?: number | null
          deadline?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          source_document_id?: string | null
          target_value?: number | null
          type?: string | null
          unit?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      work_entries: {
        Row: {
          achievements: string[] | null
          category: string | null
          created_at: string
          encrypted_original: string
          id: string
          metrics: Json | null
          redacted_summary: string
          skills: string[] | null
          target_ids: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          achievements?: string[] | null
          category?: string | null
          created_at?: string
          encrypted_original: string
          id?: string
          metrics?: Json | null
          redacted_summary: string
          skills?: string[] | null
          target_ids?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          achievements?: string[] | null
          category?: string | null
          created_at?: string
          encrypted_original?: string
          id?: string
          metrics?: Json | null
          redacted_summary?: string
          skills?: string[] | null
          target_ids?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      work_entry_targets: {
        Row: {
          contribution_note: string | null
          contribution_value: number | null
          created_at: string | null
          id: string
          smart_data: Json | null
          target_id: string | null
          work_entry_id: string | null
        }
        Insert: {
          contribution_note?: string | null
          contribution_value?: number | null
          created_at?: string | null
          id?: string
          smart_data?: Json | null
          target_id?: string | null
          work_entry_id?: string | null
        }
        Update: {
          contribution_note?: string | null
          contribution_value?: number | null
          created_at?: string | null
          id?: string
          smart_data?: Json | null
          target_id?: string | null
          work_entry_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_entry_targets_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "targets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_entry_targets_work_entry_id_fkey"
            columns: ["work_entry_id"]
            isOneToOne: false
            referencedRelation: "work_entries"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
