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
      future_investments: {
        Row: {
          created_at: string
          custom_platform_name: string | null
          estimated_amount: number | null
          estimated_end_date: string | null
          estimated_open_date: string | null
          expected_return: number | null
          id: string
          notes: string | null
          platform: string
          project_name: string
          source_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          custom_platform_name?: string | null
          estimated_amount?: number | null
          estimated_end_date?: string | null
          estimated_open_date?: string | null
          expected_return?: number | null
          id?: string
          notes?: string | null
          platform: string
          project_name: string
          source_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          custom_platform_name?: string | null
          estimated_amount?: number | null
          estimated_end_date?: string | null
          estimated_open_date?: string | null
          expected_return?: number | null
          id?: string
          notes?: string | null
          platform?: string
          project_name?: string
          source_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      investment_schedule: {
        Row: {
          created_at: string | null
          expected_amount: number
          expected_date: string
          id: string
          investment_id: string
          matched_payment_id: string | null
          status: string | null
          type: string
        }
        Insert: {
          created_at?: string | null
          expected_amount: number
          expected_date: string
          id?: string
          investment_id: string
          matched_payment_id?: string | null
          status?: string | null
          type: string
        }
        Update: {
          created_at?: string | null
          expected_amount?: number
          expected_date?: string
          id?: string
          investment_id?: string
          matched_payment_id?: string | null
          status?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "investment_schedule_investment_id_fkey"
            columns: ["investment_id"]
            isOneToOne: false
            referencedRelation: "investments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "investment_schedule_matched_payment_id_fkey"
            columns: ["matched_payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      investments: {
        Row: {
          actual_end_date: string | null
          amount: number
          amount_eur: number | null
          amount_recovered: number | null
          close_reason: Database["public"]["Enums"]["close_reason_type"] | null
          country: string | null
          created_at: string
          currency: string
          custom_platform_name: string | null
          defaulted_at: string | null
          equity_type: string | null
          exchange_rate: number | null
          exchange_rate_date: string | null
          exchange_rate_source: string | null
          expected_end_date: string | null
          expected_return: number
          id: string
          income_model: string | null
          investment_date: string
          notes: string | null
          original_amount: number | null
          original_currency: string | null
          payment_frequency: string | null
          platform: string
          principal_return_type: string | null
          project_name: string
          source_url: string | null
          status: string
          updated_at: string
          user_id: string
          was_extended: boolean
        }
        Insert: {
          actual_end_date?: string | null
          amount: number
          amount_eur?: number | null
          amount_recovered?: number | null
          close_reason?: Database["public"]["Enums"]["close_reason_type"] | null
          country?: string | null
          created_at?: string
          currency?: string
          custom_platform_name?: string | null
          defaulted_at?: string | null
          equity_type?: string | null
          exchange_rate?: number | null
          exchange_rate_date?: string | null
          exchange_rate_source?: string | null
          expected_end_date?: string | null
          expected_return: number
          id?: string
          income_model?: string | null
          investment_date: string
          notes?: string | null
          original_amount?: number | null
          original_currency?: string | null
          payment_frequency?: string | null
          platform: string
          principal_return_type?: string | null
          project_name: string
          source_url?: string | null
          status?: string
          updated_at?: string
          user_id: string
          was_extended?: boolean
        }
        Update: {
          actual_end_date?: string | null
          amount?: number
          amount_eur?: number | null
          amount_recovered?: number | null
          close_reason?: Database["public"]["Enums"]["close_reason_type"] | null
          country?: string | null
          created_at?: string
          currency?: string
          custom_platform_name?: string | null
          defaulted_at?: string | null
          equity_type?: string | null
          exchange_rate?: number | null
          exchange_rate_date?: string | null
          exchange_rate_source?: string | null
          expected_end_date?: string | null
          expected_return?: number
          id?: string
          income_model?: string | null
          investment_date?: string
          notes?: string | null
          original_amount?: number | null
          original_currency?: string | null
          payment_frequency?: string | null
          platform?: string
          principal_return_type?: string | null
          project_name?: string
          source_url?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          was_extended?: boolean
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          data: Json | null
          id: string
          message: string
          read: boolean | null
          title: string
          type: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: string
          message: string
          read?: boolean | null
          title: string
          type?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: string
          message?: string
          read?: boolean | null
          title?: string
          type?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      opportunities: {
        Row: {
          created_at: string
          current_amount: number
          description: string | null
          expected_return: number
          funding_progress: number
          id: string
          image_url: string | null
          is_favorite: boolean
          location: string
          min_investment: number
          notes: string | null
          platform: string
          project_name: string
          project_type: string
          risk_level: string
          scraped_at: string | null
          source: string
          status: string
          target_amount: number
          term: number
          updated_at: string
          url: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          current_amount?: number
          description?: string | null
          expected_return: number
          funding_progress?: number
          id?: string
          image_url?: string | null
          is_favorite?: boolean
          location?: string
          min_investment?: number
          notes?: string | null
          platform: string
          project_name: string
          project_type?: string
          risk_level?: string
          scraped_at?: string | null
          source?: string
          status?: string
          target_amount?: number
          term: number
          updated_at?: string
          url?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          current_amount?: number
          description?: string | null
          expected_return?: number
          funding_progress?: number
          id?: string
          image_url?: string | null
          is_favorite?: boolean
          location?: string
          min_investment?: number
          notes?: string | null
          platform?: string
          project_name?: string
          project_type?: string
          risk_level?: string
          scraped_at?: string | null
          source?: string
          status?: string
          target_amount?: number
          term?: number
          updated_at?: string
          url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          amount_eur: number | null
          created_at: string
          date: string
          exchange_rate: number | null
          exchange_rate_date: string | null
          exchange_rate_source: string | null
          foreign_withholding_amount: number | null
          foreign_withholding_currency: string | null
          id: string
          investment_id: string
          notes: string | null
          original_amount: number | null
          original_currency: string | null
          type: string
          withholding_applied: number | null
        }
        Insert: {
          amount: number
          amount_eur?: number | null
          created_at?: string
          date: string
          exchange_rate?: number | null
          exchange_rate_date?: string | null
          exchange_rate_source?: string | null
          foreign_withholding_amount?: number | null
          foreign_withholding_currency?: string | null
          id?: string
          investment_id: string
          notes?: string | null
          original_amount?: number | null
          original_currency?: string | null
          type: string
          withholding_applied?: number | null
        }
        Update: {
          amount?: number
          amount_eur?: number | null
          created_at?: string
          date?: string
          exchange_rate?: number | null
          exchange_rate_date?: string | null
          exchange_rate_source?: string | null
          foreign_withholding_amount?: number | null
          foreign_withholding_currency?: string | null
          id?: string
          investment_id?: string
          notes?: string | null
          original_amount?: number | null
          original_currency?: string | null
          type?: string
          withholding_applied?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_investment_id_fkey"
            columns: ["investment_id"]
            isOneToOne: false
            referencedRelation: "investments"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          pro_welcome_shown: boolean
          stripe_customer_id: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          pro_welcome_shown?: boolean
          stripe_customer_id?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          pro_welcome_shown?: boolean
          stripe_customer_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          import_count_this_month: number | null
          import_reset_date: string | null
          is_beta_pro: boolean
          plan: string
          pro_until: string | null
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          import_count_this_month?: number | null
          import_reset_date?: string | null
          is_beta_pro?: boolean
          plan?: string
          pro_until?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          import_count_this_month?: number | null
          import_reset_date?: string | null
          is_beta_pro?: boolean
          plan?: string
          pro_until?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      tax_expenses: {
        Row: {
          amount: number
          category: string
          created_at: string | null
          date: string | null
          description: string | null
          id: string
          notes: string | null
          updated_at: string
          user_id: string
          year: number
        }
        Insert: {
          amount: number
          category: string
          created_at?: string | null
          date?: string | null
          description?: string | null
          id?: string
          notes?: string | null
          updated_at?: string
          user_id: string
          year: number
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string | null
          date?: string | null
          description?: string | null
          id?: string
          notes?: string | null
          updated_at?: string
          user_id?: string
          year?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          role?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      close_reason_type: "on_time" | "early" | "extended" | "sold"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      close_reason_type: ["on_time", "early", "extended", "sold"],
    },
  },
} as const
