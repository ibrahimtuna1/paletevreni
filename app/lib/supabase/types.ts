// app/lib/supabase/types.ts
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; full_name: string | null; role: "ogrenci" | "ogretmen" | null; created_at: string };
        Insert: { id: string; full_name?: string | null; role?: "ogrenci" | "ogretmen" | null; created_at?: string };
        Update: { full_name?: string | null; role?: "ogrenci" | "ogretmen" | null };
      };
      packages: {
        Row: { id: string; name: string; price: number; currency: string; description: string | null; is_active: boolean; created_at: string };
        Insert: { id?: string; name: string; price: number; currency?: string; description?: string | null; is_active?: boolean; created_at?: string };
        Update: { name?: string; price?: number; currency?: string; description?: string | null; is_active?: boolean };
      };
      trial_requests: {
        Row: { id: string; full_name: string; email: string; phone: string | null; preferred_day: string | null; notes: string | null; status: string; created_at: string };
        Insert: { id?: string; full_name: string; email: string; phone?: string | null; preferred_day?: string | null; notes?: string | null; status?: string; created_at?: string };
        Update: { full_name?: string; email?: string; phone?: string | null; preferred_day?: string | null; notes?: string | null; status?: string };
      };
      enrollments: {
        Row: { id: string; user_id: string | null; package_id: string | null; status: string; start_date: string | null; created_at: string };
        Insert: { id?: string; user_id?: string | null; package_id?: string | null; status?: string; start_date?: string | null; created_at?: string };
        Update: { user_id?: string | null; package_id?: string | null; status?: string; start_date?: string | null };
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
  };
}
