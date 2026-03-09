/**
 * Server-side Supabase client.
 *
 * IMPORTANT:
 * - This file is NOT imported anywhere in the Vite/React frontend bundle.
 * - It is intended for use in server runtimes only (Supabase Edge Functions,
 *   Node scripts, etc.) where the service-role key can be used safely.
 *
 * If you need Supabase inside React components or browser code, use
 * `src/lib/supabase/client.ts` instead.
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export function createServerSupabaseClient() {
  const url =
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Server Supabase client requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables."
    );
  }

  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      persistSession: false,
    },
  });
}

