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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      target_events: {
        Row: {
          id: string
          user_id: string
          title: string
          start_date: string
          target_date: string
          is_active: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          start_date?: string
          target_date: string
          is_active?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          start_date?: string
          target_date?: string
          is_active?: boolean | null
          created_at?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          id: string
          user_id: string
          endpoint: string
          p256dh: string
          auth_key: string
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          endpoint: string
          p256dh: string
          auth_key: string
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          endpoint?: string
          p256dh?: string
          auth_key?: string
          created_at?: string | null
        }
        Relationships: []
      }
      ai_routines: {
        Row: {
          created_at: string | null
          goal: string
          id: string
          is_active: boolean | null
          routine_data: Json
          user_id: string
        }
        Insert: {
          created_at?: string | null
          goal: string
          id?: string
          is_active?: boolean | null
          routine_data: Json
          user_id: string
        }
        Update: {
          created_at?: string | null
          goal?: string
          id?: string
          is_active?: boolean | null
          routine_data?: Json
          user_id?: string
        }
        Relationships: []
      }
      body_stats: {
        Row: {
          body_fat_pct: number | null
          created_at: string | null
          id: string
          muscle_mass_kg: number | null
          recorded_at: string
          user_id: string
          weight_kg: number | null
        }
        Insert: {
          body_fat_pct?: number | null
          created_at?: string | null
          id?: string
          muscle_mass_kg?: number | null
          recorded_at: string
          user_id: string
          weight_kg?: number | null
        }
        Update: {
          body_fat_pct?: number | null
          created_at?: string | null
          id?: string
          muscle_mass_kg?: number | null
          recorded_at?: string
          user_id?: string
          weight_kg?: number | null
        }
        Relationships: []
      }
      exercises: {
        Row: {
          brand: string | null
          category: string | null
          created_at: string | null
          equipment: string | null
          id: string
          muscle_group: string
          name: string
        }
        Insert: {
          brand?: string | null
          category?: string | null
          created_at?: string | null
          equipment?: string | null
          id?: string
          muscle_group: string
          name: string
        }
        Update: {
          brand?: string | null
          category?: string | null
          created_at?: string | null
          equipment?: string | null
          id?: string
          muscle_group?: string
          name?: string
        }
        Relationships: []
      }
      foods: {
        Row: {
          brand: string | null
          calories_per_100g: number
          carbs_per_100g: number
          category: string | null
          created_at: string | null
          fat_per_100g: number
          id: string
          name: string
          protein_per_100g: number
          serving_size_g: number | null
          serving_unit: string | null
        }
        Insert: {
          brand?: string | null
          calories_per_100g: number
          carbs_per_100g?: number
          category?: string | null
          created_at?: string | null
          fat_per_100g?: number
          id?: string
          name: string
          protein_per_100g?: number
          serving_size_g?: number | null
          serving_unit?: string | null
        }
        Update: {
          brand?: string | null
          calories_per_100g?: number
          carbs_per_100g?: number
          category?: string | null
          created_at?: string | null
          fat_per_100g?: number
          id?: string
          name?: string
          protein_per_100g?: number
          serving_size_g?: number | null
          serving_unit?: string | null
        }
        Relationships: []
      }
      meal_items: {
        Row: {
          amount_g: number | null
          calories: number | null
          carbs_g: number | null
          created_at: string | null
          fat_g: number | null
          food_name: string
          id: string
          meal_id: string
          protein_g: number | null
        }
        Insert: {
          amount_g?: number | null
          calories?: number | null
          carbs_g?: number | null
          created_at?: string | null
          fat_g?: number | null
          food_name: string
          id?: string
          meal_id: string
          protein_g?: number | null
        }
        Update: {
          amount_g?: number | null
          calories?: number | null
          carbs_g?: number | null
          created_at?: string | null
          fat_g?: number | null
          food_name?: string
          id?: string
          meal_id?: string
          protein_g?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "meal_items_meal_id_fkey"
            columns: ["meal_id"]
            isOneToOne: false
            referencedRelation: "meals"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_template_items: {
        Row: {
          amount_g: number
          calories: number | null
          carbs_g: number | null
          fat_g: number | null
          food_name: string
          id: string
          protein_g: number | null
          sort_order: number | null
          template_id: string
        }
        Insert: {
          amount_g: number
          calories?: number | null
          carbs_g?: number | null
          fat_g?: number | null
          food_name: string
          id?: string
          protein_g?: number | null
          sort_order?: number | null
          template_id: string
        }
        Update: {
          amount_g?: number
          calories?: number | null
          carbs_g?: number | null
          fat_g?: number | null
          food_name?: string
          id?: string
          protein_g?: number | null
          sort_order?: number | null
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_template_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "meal_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_templates: {
        Row: {
          created_at: string | null
          id: string
          meal_type: string | null
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          meal_type?: string | null
          name: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          meal_type?: string | null
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      meals: {
        Row: {
          created_at: string | null
          eaten_at: string
          id: string
          meal_type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          eaten_at: string
          id?: string
          meal_type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          eaten_at?: string
          id?: string
          meal_type?: string
          user_id?: string
        }
        Relationships: []
      }
      sets: {
        Row: {
          created_at: string | null
          id: string
          one_rm: number | null
          reps: number | null
          rest_seconds: number | null
          set_number: number
          set_type: string
          weight_kg: number | null
          workout_exercise_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          one_rm?: number | null
          reps?: number | null
          rest_seconds?: number | null
          set_number: number
          set_type?: string
          weight_kg?: number | null
          workout_exercise_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          one_rm?: number | null
          reps?: number | null
          rest_seconds?: number | null
          set_number?: number
          set_type?: string
          weight_kg?: number | null
          workout_exercise_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sets_workout_exercise_id_fkey"
            columns: ["workout_exercise_id"]
            isOneToOne: false
            referencedRelation: "workout_exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      suggestions: {
        Row: {
          admin_reply: string | null
          content: string
          created_at: string | null
          id: string
          status: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          admin_reply?: string | null
          content: string
          created_at?: string | null
          id?: string
          status?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          admin_reply?: string | null
          content?: string
          created_at?: string | null
          id?: string
          status?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          activity_level: string | null
          age: number | null
          available_equipment: string[] | null
          created_at: string | null
          current_weight_kg: number | null
          dietary_restrictions: string[] | null
          gender: string | null
          goal: string | null
          height_cm: number | null
          id: string
          is_admin: boolean | null
          is_blocked: boolean | null
          target_calories: number | null
          target_carbs_g: number | null
          target_fat_g: number | null
          target_protein_g: number | null
          target_weight_kg: number | null
          updated_at: string | null
          user_id: string
          workout_days_per_week: number | null
        }
        Insert: {
          activity_level?: string | null
          age?: number | null
          available_equipment?: string[] | null
          created_at?: string | null
          current_weight_kg?: number | null
          dietary_restrictions?: string[] | null
          gender?: string | null
          goal?: string | null
          height_cm?: number | null
          id?: string
          is_admin?: boolean | null
          is_blocked?: boolean | null
          target_calories?: number | null
          target_carbs_g?: number | null
          target_fat_g?: number | null
          target_protein_g?: number | null
          target_weight_kg?: number | null
          updated_at?: string | null
          user_id: string
          workout_days_per_week?: number | null
        }
        Update: {
          activity_level?: string | null
          age?: number | null
          available_equipment?: string[] | null
          created_at?: string | null
          current_weight_kg?: number | null
          dietary_restrictions?: string[] | null
          gender?: string | null
          goal?: string | null
          height_cm?: number | null
          id?: string
          is_admin?: boolean | null
          is_blocked?: boolean | null
          target_calories?: number | null
          target_carbs_g?: number | null
          target_fat_g?: number | null
          target_protein_g?: number | null
          target_weight_kg?: number | null
          updated_at?: string | null
          user_id?: string
          workout_days_per_week?: number | null
        }
        Relationships: []
      }
      workout_exercises: {
        Row: {
          created_at: string | null
          exercise_id: string
          id: string
          order_index: number
          workout_id: string
        }
        Insert: {
          created_at?: string | null
          exercise_id: string
          id?: string
          order_index: number
          workout_id: string
        }
        Update: {
          created_at?: string | null
          exercise_id?: string
          id?: string
          order_index?: number
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_exercises_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      workouts: {
        Row: {
          created_at: string | null
          finished_at: string | null
          id: string
          memo: string | null
          started_at: string
          total_seconds: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          finished_at?: string | null
          id?: string
          memo?: string | null
          started_at: string
          total_seconds?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          finished_at?: string | null
          id?: string
          memo?: string | null
          started_at?: string
          total_seconds?: number | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
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
