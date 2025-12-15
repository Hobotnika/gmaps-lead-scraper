export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type JobStatus = 'pending' | 'running' | 'completed' | 'failed'

export interface Database {
  public: {
    Tables: {
      scrape_jobs: {
        Row: {
          id: string
          search_query: string
          location: string
          max_results: number
          status: JobStatus
          created_at: string
          completed_at: string | null
          error_message: string | null
        }
        Insert: {
          id?: string
          search_query: string
          location: string
          max_results?: number
          status?: JobStatus
          created_at?: string
          completed_at?: string | null
          error_message?: string | null
        }
        Update: {
          id?: string
          search_query?: string
          location?: string
          max_results?: number
          status?: JobStatus
          created_at?: string
          completed_at?: string | null
          error_message?: string | null
        }
      }
      leads: {
        Row: {
          id: string
          job_id: string
          business_name: string
          address: string | null
          phone: string | null
          website: string | null
          rating: number | null
          review_count: number | null
          category: string | null
          email: string | null
          email_found_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          job_id: string
          business_name: string
          address?: string | null
          phone?: string | null
          website?: string | null
          rating?: number | null
          review_count?: number | null
          category?: string | null
          email?: string | null
          email_found_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          job_id?: string
          business_name?: string
          address?: string | null
          phone?: string | null
          website?: string | null
          rating?: number | null
          review_count?: number | null
          category?: string | null
          email?: string | null
          email_found_at?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      jobs_with_stats: {
        Row: {
          id: string
          search_query: string
          location: string
          max_results: number
          status: JobStatus
          created_at: string
          completed_at: string | null
          error_message: string | null
          total_leads: number
          leads_with_email: number
        }
      }
    }
    Functions: {}
    Enums: {}
  }
}

// Convenience types
export type ScrapeJob = Database['public']['Tables']['scrape_jobs']['Row']
export type ScrapeJobInsert = Database['public']['Tables']['scrape_jobs']['Insert']
export type ScrapeJobUpdate = Database['public']['Tables']['scrape_jobs']['Update']

export type Lead = Database['public']['Tables']['leads']['Row']
export type LeadInsert = Database['public']['Tables']['leads']['Insert']
export type LeadUpdate = Database['public']['Tables']['leads']['Update']

export type JobWithStats = Database['public']['Views']['jobs_with_stats']['Row']
