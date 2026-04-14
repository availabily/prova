export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          created_at: string
          plan: 'free' | 'team' | 'enterprise'
          stripe_customer_id: string | null
        }
        Insert: {
          id?: string
          email: string
          created_at?: string
          plan?: 'free' | 'team' | 'enterprise'
          stripe_customer_id?: string | null
        }
        Update: {
          id?: string
          email?: string
          created_at?: string
          plan?: 'free' | 'team' | 'enterprise'
          stripe_customer_id?: string | null
        }
      }
      api_keys: {
        Row: {
          id: string
          user_id: string
          key_hash: string
          label: string | null
          created_at: string
          last_used_at: string | null
          is_active: boolean
        }
        Insert: {
          id?: string
          user_id: string
          key_hash: string
          label?: string | null
          created_at?: string
          last_used_at?: string | null
          is_active?: boolean
        }
        Update: {
          id?: string
          user_id?: string
          key_hash?: string
          label?: string | null
          created_at?: string
          last_used_at?: string | null
          is_active?: boolean
        }
      }
      certificates: {
        Row: {
          id: string
          created_at: string
          verdict: 'VALID' | 'INVALID'
          confidence_score: number
          prova_version: string
          validator_version: string
          extraction_prompt_version: string
          argument_graph: Json
          failure: Json | null
          original_reasoning: string | null
          metadata: Json
          sha256: string
          user_id: string | null
          api_key_id: string | null
          superseded: boolean
          superseded_by: string | null
        }
        Insert: {
          id: string
          created_at?: string
          verdict: 'VALID' | 'INVALID'
          confidence_score: number
          prova_version: string
          validator_version: string
          extraction_prompt_version?: string
          argument_graph: Json
          failure?: Json | null
          original_reasoning?: string | null
          metadata?: Json
          sha256: string
          user_id?: string | null
          api_key_id?: string | null
          superseded?: boolean
          superseded_by?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          verdict?: 'VALID' | 'INVALID'
          confidence_score?: number
          prova_version?: string
          validator_version?: string
          extraction_prompt_version?: string
          argument_graph?: Json
          failure?: Json | null
          original_reasoning?: string | null
          metadata?: Json
          sha256?: string
          user_id?: string | null
          api_key_id?: string | null
          superseded?: boolean
          superseded_by?: string | null
        }
      }
      usage: {
        Row: {
          id: string
          api_key_id: string | null
          user_id: string | null
          created_at: string
          verdict: string | null
          failure_type: string | null
          reasoning_length_chars: number | null
          format: string | null
          retain: boolean | null
          metadata: Json
        }
        Insert: {
          id?: string
          api_key_id?: string | null
          user_id?: string | null
          created_at?: string
          verdict?: string | null
          failure_type?: string | null
          reasoning_length_chars?: number | null
          format?: string | null
          retain?: boolean | null
          metadata?: Json
        }
        Update: {
          id?: string
          api_key_id?: string | null
          user_id?: string | null
          created_at?: string
          verdict?: string | null
          failure_type?: string | null
          reasoning_length_chars?: number | null
          format?: string | null
          retain?: boolean | null
          metadata?: Json
        }
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