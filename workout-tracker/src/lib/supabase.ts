import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Plan = {
  id: string
  user_id: string
  name: string
  description: string | null
  created_at: string
}

export type PlanExercise = {
  id: string
  plan_id: string
  exercise_name: string
  sets: number
  reps: string
  rest_seconds: number
  sort_order: number
}

export type WorkoutSession = {
  id: string
  user_id: string
  plan_id: string | null
  plan_name: string | null
  date: string
  duration_minutes: number | null
  notes: string | null
  created_at: string
}

export type SessionSet = {
  id: string
  session_id: string
  exercise_name: string
  set_number: number
  weight_kg: number
  reps: number
  completed: boolean
}
