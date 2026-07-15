import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** Whether the Supabase environment variables are configured */
export const isConfigured = !!supabaseUrl && !!supabaseAnonKey;

if (!isConfigured) {
  console.error(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in environment variables. " +
      "Copy .env.example to .env and fill in your Supabase project credentials."
  );
}

/**
 * Public (anon) client — used for all Supabase operations.
 * Reads are allowed via RLS SELECT policies (SELECT only).
 * Writes go through SECURITY DEFINER RPC functions.
 *
 * NOTE: This client is created even without env vars (pointing to empty strings).
 * Components should check `isConfigured` before making calls.
 */
export const supabase = createClient(supabaseUrl ?? "", supabaseAnonKey ?? "", {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
