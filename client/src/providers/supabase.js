import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const placeholderTokens = ["your-project-ref", "your-supabase-anon-key"];

function hasPlaceholder(value = "") {
  return placeholderTokens.some((token) => value.includes(token));
}

export const supabaseConfigError =
  !supabaseUrl || !supabaseAnonKey
    ? "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in client/.env"
    : hasPlaceholder(supabaseUrl) || hasPlaceholder(supabaseAnonKey)
      ? "Replace placeholder Supabase values in client/.env before using login/register"
      : "";

export const supabase = supabaseConfigError ? null : createClient(supabaseUrl, supabaseAnonKey);
