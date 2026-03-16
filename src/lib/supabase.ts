import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in environment variables. " +
      "Copy .env.example to .env and fill in your Supabase project credentials."
  );
}

/**
 * Public (anon) client — used for all Supabase operations.
 * Reads are allowed via RLS SELECT policies.
 * Writes go through SECURITY DEFINER RPC functions.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
