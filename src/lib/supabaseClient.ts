import { createClient } from "@supabase/supabase-js";

// Usa import.meta.env (mais seguro no browser)
const supabaseUrl = (import.meta as any).env?.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = (import.meta as any).env?.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
