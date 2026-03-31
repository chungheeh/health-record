export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
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
          created_at: string | null
          equipment: string | null
          id: string
          muscle_group: string
          name: string
        }
        Insert: {
          created_at?: string | null
          equipment?: string | null
          id?: string
          muscle_group: string
          name: string
        }
        Update: {
          created_at?: string | null
          equipment?: string | null
          id?: string
          muscle_group?: string
          name?: string
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
            foreignKeyName: 'meal_items_meal_id_fkey'
            columns: ['meal_id']
            isOneToOne: false
            referencedRelation: 'meals'
            referencedColumns: ['id']
          },
        ]
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
          weight_kg?: number | null
          workout_exercise_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'sets_workout_exercise_id_fkey'
            columns: ['workout_exercise_id']
            isOneToOne: false
            referencedRelation: 'workout_exercises'
            referencedColumns: ['id']
          },
        ]
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
            foreignKeyName: 'workout_exercises_exercise_id_fkey'
            columns: ['exercise_id']
            isOneToOne: false
            referencedRelation: 'exercises'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'workout_exercises_workout_id_fkey'
            columns: ['workout_id']
            isOneToOne: false
            referencedRelation: 'workouts'
            referencedColumns: ['id']
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
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']
