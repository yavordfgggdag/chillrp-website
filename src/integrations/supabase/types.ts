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
      faq_items: {
        Row: {
          answer: string
          category: string
          created_at: string
          id: string
          is_active: boolean
          question: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          answer: string
          category?: string
          created_at?: string
          id?: string
          is_active?: boolean
          question: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          answer?: string
          category?: string
          created_at?: string
          id?: string
          is_active?: boolean
          question?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      gang_applications: {
        Row: {
          admin_note: string | null
          discord_username: string | null
          gang_type: string
          goal: string
          history: string
          id: string
          leader: string
          members: string
          name: string
          reviewed_at: string | null
          rp_examples: string
          rules: string
          status: string
          submitted_at: string
          user_id: string | null
        }
        Insert: {
          admin_note?: string | null
          discord_username?: string | null
          gang_type: string
          goal: string
          history: string
          id?: string
          leader: string
          members: string
          name: string
          reviewed_at?: string | null
          rp_examples: string
          rules: string
          status?: string
          submitted_at?: string
          user_id?: string | null
        }
        Update: {
          admin_note?: string | null
          discord_username?: string | null
          gang_type?: string
          goal?: string
          history?: string
          id?: string
          leader?: string
          members?: string
          name?: string
          reviewed_at?: string | null
          rp_examples?: string
          rules?: string
          status?: string
          submitted_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      products: {
        Row: {
          badge: string | null
          category: string
          created_at: string
          description: string
          id: string
          image_url: string | null
          includes: string[]
          is_active: boolean
          long_description: string
          name: string
          original_price: string
          price: string
          slug: string
          sort_order: number
          stripe_price: string | null
          subtitle: string
          updated_at: string
        }
        Insert: {
          badge?: string | null
          category?: string
          created_at?: string
          description?: string
          id?: string
          image_url?: string | null
          includes?: string[]
          is_active?: boolean
          long_description?: string
          name: string
          original_price: string
          price: string
          slug: string
          sort_order?: number
          stripe_price?: string | null
          subtitle?: string
          updated_at?: string
        }
        Update: {
          badge?: string | null
          category?: string
          created_at?: string
          description?: string
          id?: string
          image_url?: string | null
          includes?: string[]
          is_active?: boolean
          long_description?: string
          name?: string
          original_price?: string
          price?: string
          slug?: string
          sort_order?: number
          stripe_price?: string | null
          subtitle?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          discord_username: string | null
          id: string
          username: string | null
        }
        Insert: {
          created_at?: string | null
          discord_username?: string | null
          id: string
          username?: string | null
        }
        Update: {
          created_at?: string | null
          discord_username?: string | null
          id?: string
          username?: string | null
        }
        Relationships: []
      }
      purchases: {
        Row: {
          category: string | null
          created_at: string
          discord_username: string | null
          id: string
          price_eur: number | null
          product_name: string
          stripe_session_id: string | null
          user_id: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          discord_username?: string | null
          id?: string
          price_eur?: number | null
          product_name: string
          stripe_session_id?: string | null
          user_id?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          discord_username?: string | null
          id?: string
          price_eur?: number | null
          product_name?: string
          stripe_session_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      rule_sections: {
        Row: {
          color: string
          created_at: string
          emoji: string
          id: string
          is_active: boolean
          items: string[]
          note: string | null
          page: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          emoji?: string
          id?: string
          is_active?: boolean
          items?: string[]
          note?: string | null
          page: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          emoji?: string
          id?: string
          is_active?: boolean
          items?: string[]
          note?: string | null
          page?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          description: string | null
          id: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          value?: string
        }
        Update: {
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      hospital_invoices: {
        Row: {
          id: string
          created_at: string
          invoice_date: string
          client_name: string
          description: string
          amount: string
          issued_by_user_id: string | null
          issued_by_name: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          invoice_date?: string
          client_name?: string
          description?: string
          amount?: string
          issued_by_user_id?: string | null
          issued_by_name?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          invoice_date?: string
          client_name?: string
          description?: string
          amount?: string
          issued_by_user_id?: string | null
          issued_by_name?: string | null
        }
        Relationships: []
      }
      hospital_shifts: {
        Row: {
          id: string
          created_at: string
          user_id: string | null
          user_name: string
          started_at: string
          ended_at: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          user_id?: string | null
          user_name?: string
          started_at: string
          ended_at?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          user_id?: string | null
          user_name?: string
          started_at?: string
          ended_at?: string | null
        }
        Relationships: []
      }
      service_invoices: {
        Row: {
          id: string
          created_at: string
          invoice_date: string
          client_name: string
          description: string
          amount: string
          issued_by_user_id: string | null
          issued_by_name: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          invoice_date?: string
          client_name?: string
          description?: string
          amount?: string
          issued_by_user_id?: string | null
          issued_by_name?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          invoice_date?: string
          client_name?: string
          description?: string
          amount?: string
          issued_by_user_id?: string | null
          issued_by_name?: string | null
        }
        Relationships: []
      }
      service_shifts: {
        Row: {
          id: string
          created_at: string
          user_id: string | null
          user_name: string
          started_at: string
          ended_at: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          user_id?: string | null
          user_name?: string
          started_at: string
          ended_at?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          user_id?: string | null
          user_name?: string
          started_at?: string
          ended_at?: string | null
        }
        Relationships: []
      }
      staff_members: {
        Row: {
          avatar_scale: string | null
          avatar_url: string | null
          bg: string
          color: string
          created_at: string
          discord_id: string | null
          emoji: string | null
          icon: string
          id: string
          name: string
          role: string
          sort_order: number
          source: string
        }
        Insert: {
          avatar_scale?: string | null
          avatar_url?: string | null
          bg?: string
          color?: string
          created_at?: string
          discord_id?: string | null
          emoji?: string | null
          icon?: string
          id?: string
          name: string
          role: string
          sort_order?: number
          source?: string
        }
        Update: {
          avatar_scale?: string | null
          avatar_url?: string | null
          bg?: string
          color?: string
          created_at?: string
          discord_id?: string | null
          emoji?: string | null
          icon?: string
          id?: string
          name?: string
          role?: string
          sort_order?: number
          source?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator"
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
      app_role: ["admin", "moderator"],
    },
  },
} as const
