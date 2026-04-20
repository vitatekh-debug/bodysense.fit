import { createClient } from "@supabase/supabase-js";
import type { Database } from "../types/index";

/**
 * Creates a Supabase client for browser/React Native usage.
 * Call once and export the instance (singleton pattern).
 *
 * Usage:
 *   import { createSupabaseClient } from "@vitatekh/shared/supabase";
 *   export const supabase = createSupabaseClient(url, key);
 */
export function createSupabaseClient(supabaseUrl: string, supabaseAnonKey: string) {
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false, // handled manually in React Native
    },
  });
}

/**
 * Creates a Supabase admin client (service_role key).
 * Use ONLY in Edge Functions / server-side code — never expose to clients.
 */
export function createSupabaseAdminClient(supabaseUrl: string, serviceRoleKey: string) {
  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
