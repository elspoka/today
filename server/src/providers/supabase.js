import { createClient } from "@supabase/supabase-js";

let cachedClients = null;
const placeholderTokens = ["your-project-ref", "your-supabase-anon-key", "your-supabase-service-role-key"];

function hasPlaceholder(value = "") {
  return placeholderTokens.some((token) => value.includes(token));
}

export function getSupabaseClients() {
  if (cachedClients) {
    return cachedClients;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variable");
  }

  if (!supabaseServiceRoleKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY environment variable");
  }

  if (
    hasPlaceholder(supabaseUrl) ||
    hasPlaceholder(supabaseAnonKey) ||
    hasPlaceholder(supabaseServiceRoleKey)
  ) {
    throw new Error("Replace placeholder Supabase values in server/.env before starting Supabase mode");
  }

  const supabaseAuthClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  const supabaseAdminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  cachedClients = {
    supabaseAuthClient,
    supabaseAdminClient
  };

  return cachedClients;
}
