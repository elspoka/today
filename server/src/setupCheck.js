import { getSupabaseClients } from "./providers/supabase.js";

export async function runSetupCheck(settings) {
  const checks = [];

  checks.push({
    name: "runtime-settings",
    ok: true,
    details: {
      dbProvider: settings.dbProvider,
      authMode: settings.authMode,
      dbStrict: settings.dbStrict,
      dbFallbackProvider: settings.dbFallbackProvider
    }
  });

  if (settings.authMode === "supabase") {
    try {
      getSupabaseClients();
      checks.push({ name: "supabase-auth-config", ok: true });
    } catch (error) {
      checks.push({ name: "supabase-auth-config", ok: false, details: error.message });
    }
  } else {
    checks.push({ name: "auth-dev-mode", ok: true });
  }

  if (settings.dbProvider === "memory") {
    checks.push({ name: "db-memory", ok: true });
  } else if (settings.dbProvider === "supabase") {
    try {
      const { supabaseAdminClient } = getSupabaseClients();
      const { error } = await supabaseAdminClient.from("todos").select("id").limit(1);

      if (error) {
        checks.push({ name: "db-supabase", ok: false, details: error.message });
      } else {
        checks.push({ name: "db-supabase", ok: true });
      }
    } catch (error) {
      checks.push({ name: "db-supabase", ok: false, details: error.message });
    }
  } else if (settings.dbProvider === "mongodb" || settings.dbProvider === "firebase") {
    checks.push({
      name: `db-${settings.dbProvider}`,
      ok: false,
      details: "Provider recognized but not implemented yet"
    });
  } else {
    checks.push({
      name: "db-provider",
      ok: false,
      details: `Unsupported DB_PROVIDER: ${settings.dbProvider}`
    });
  }

  const ok = checks.every((check) => check.ok);
  return { ok, checks };
}
