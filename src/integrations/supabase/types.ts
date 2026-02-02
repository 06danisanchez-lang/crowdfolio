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
      assets: {
        Row: {
          acquisition_cost: number
          asset_type: Database["public"]["Enums"]["asset_type"]
          country_code: string
          created_at: string
          expected_end_date: string | null
          expected_return: number | null
          id: string
          investment_date: string
          notes: string | null
          platform_name: string
          project_name: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          acquisition_cost: number
          asset_type: Database["public"]["Enums"]["asset_type"]
          country_code?: string
          created_at?: string
          expected_end_date?: string | null
          expected_return?: number | null
          id?: string
          investment_date: string
          notes?: string | null
          platform_name: string
          project_name: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          acquisition_cost?: number
          asset_type?: Database["public"]["Enums"]["asset_type"]
          country_code?: string
          created_at?: string
          expected_end_date?: string | null
          expected_return?: number | null
          id?: string
          investment_date?: string
          notes?: string | null
          platform_name?: string
          project_name?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      investments: {
        Row: {
          amount: number
          created_at: string
          custom_platform_name: string | null
          expected_end_date: string | null
          expected_return: number
          id: string
          investment_date: string
          notes: string | null
          platform: string
          project_name: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          custom_platform_name?: string | null
          expected_end_date?: string | null
          expected_return: number
          id?: string
          investment_date: string
          notes?: string | null
          platform: string
          project_name: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          custom_platform_name?: string | null
          expected_end_date?: string | null
          expected_return?: number
          id?: string
          investment_date?: string
          notes?: string | null
          platform?: string
          project_name?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          data: Json | null
          id: string
          message: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: string
          message: string
          read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: string
          message?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
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
      opportunity_alerts: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          locations: string[] | null
          max_min_investment: number | null
          max_return: number | null
          max_term: number | null
          min_return: number | null
          name: string
          platforms: string[] | null
          project_types: string[] | null
          risk_levels: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          locations?: string[] | null
          max_min_investment?: number | null
          max_return?: number | null
          max_term?: number | null
          min_return?: number | null
          name: string
          platforms?: string[] | null
          project_types?: string[] | null
          risk_levels?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          locations?: string[] | null
          max_min_investment?: number | null
          max_return?: number | null
          max_term?: number | null
          min_return?: number | null
          name?: string
          platforms?: string[] | null
          project_types?: string[] | null
          risk_levels?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          date: string
          id: string
          investment_id: string
          notes: string | null
          type: string
          withholding_applied: number | null
        }
        Insert: {
          amount: number
          created_at?: string
          date: string
          id?: string
          investment_id: string
          notes?: string | null
          type: string
          withholding_applied?: number | null
        }
        Update: {
          amount?: number
          created_at?: string
          date?: string
          id?: string
          investment_id?: string
          notes?: string | null
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
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          import_count_this_month: number
          import_reset_date: string
          plan: Database["public"]["Enums"]["subscription_plan"]
          status: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          import_count_this_month?: number
          import_reset_date?: string
          plan?: Database["public"]["Enums"]["subscription_plan"]
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          import_count_this_month?: number
          import_reset_date?: string
          plan?: Database["public"]["Enums"]["subscription_plan"]
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tax_expenses: {
        Row: {
          amount: number
          category: Database["public"]["Enums"]["tax_expense_category"]
          created_at: string
          date: string
          description: string
          id: string
          investment_id: string | null
          notes: string | null
          updated_at: string
          user_id: string
          year: number
        }
        Insert: {
          amount: number
          category: Database["public"]["Enums"]["tax_expense_category"]
          created_at?: string
          date: string
          description: string
          id?: string
          investment_id?: string | null
          notes?: string | null
          updated_at?: string
          user_id: string
          year: number
        }
        Update: {
          amount?: number
          category?: Database["public"]["Enums"]["tax_expense_category"]
          created_at?: string
          date?: string
          description?: string
          id?: string
          investment_id?: string | null
          notes?: string | null
          updated_at?: string
          user_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "tax_expenses_investment_id_fkey"
            columns: ["investment_id"]
            isOneToOne: false
            referencedRelation: "investments"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_years: {
        Row: {
          created_at: string
          gpp_losses_carried: number | null
          id: string
          rcm_losses_carried: number | null
          updated_at: string
          user_id: string
          year: number
        }
        Insert: {
          created_at?: string
          gpp_losses_carried?: number | null
          id?: string
          rcm_losses_carried?: number | null
          updated_at?: string
          user_id: string
          year: number
        }
        Update: {
          created_at?: string
          gpp_losses_carried?: number | null
          id?: string
          rcm_losses_carried?: number | null
          updated_at?: string
          user_id?: string
          year?: number
        }
        Relationships: []
      }
      transactions: {
        Row: {
          asset_id: string
          created_at: string
          currency: string | null
          date: string
          gross_amount: number
          id: string
          notes: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          withholding_amount: number | null
        }
        Insert: {
          asset_id: string
          created_at?: string
          currency?: string | null
          date: string
          gross_amount: number
          id?: string
          notes?: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          withholding_amount?: number | null
        }
        Update: {
          asset_id?: string
          created_at?: string
          currency?: string | null
          date?: string
          gross_amount?: number
          id?: string
          notes?: string | null
          type?: Database["public"]["Enums"]["transaction_type"]
          withholding_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_platforms: {
        Row: {
          country_code: string
          created_at: string
          default_withholding: number | null
          id: string
          logo_url: string | null
          name: string
          notes: string | null
          platform_type: Database["public"]["Enums"]["platform_type"]
          registration_date: string | null
          status: Database["public"]["Enums"]["platform_status"]
          updated_at: string
          user_id: string
          username: string | null
          website_url: string | null
        }
        Insert: {
          country_code?: string
          created_at?: string
          default_withholding?: number | null
          id?: string
          logo_url?: string | null
          name: string
          notes?: string | null
          platform_type?: Database["public"]["Enums"]["platform_type"]
          registration_date?: string | null
          status?: Database["public"]["Enums"]["platform_status"]
          updated_at?: string
          user_id: string
          username?: string | null
          website_url?: string | null
        }
        Update: {
          country_code?: string
          created_at?: string
          default_withholding?: number | null
          id?: string
          logo_url?: string | null
          name?: string
          notes?: string | null
          platform_type?: Database["public"]["Enums"]["platform_type"]
          registration_date?: string | null
          status?: Database["public"]["Enums"]["platform_status"]
          updated_at?: string
          user_id?: string
          username?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_email: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_user_pro: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user"
      asset_type: "LENDING" | "EQUITY"
      platform_status: "active" | "inactive" | "pending_verification"
      platform_type: "equity" | "lending" | "real_estate" | "mixed"
      subscription_plan: "free" | "monthly" | "yearly"
      subscription_status: "free" | "active" | "past_due" | "canceled"
      tax_expense_category:
        | "platform_fees"
        | "advisory"
        | "management"
        | "travel"
        | "other"
      transaction_type: "INTEREST" | "DIVIDEND" | "SALE" | "LOSS"
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
      app_role: ["admin", "user"],
      asset_type: ["LENDING", "EQUITY"],
      platform_status: ["active", "inactive", "pending_verification"],
      platform_type: ["equity", "lending", "real_estate", "mixed"],
      subscription_plan: ["free", "monthly", "yearly"],
      subscription_status: ["free", "active", "past_due", "canceled"],
      tax_expense_category: [
        "platform_fees",
        "advisory",
        "management",
        "travel",
        "other",
      ],
      transaction_type: ["INTEREST", "DIVIDEND", "SALE", "LOSS"],
    },
  },
} as const
