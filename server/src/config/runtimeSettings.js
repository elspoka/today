const providerAliases = {
  memory: "memory",
  inmemory: "memory",
  supabase: "supabase",
  postgres: "supabase",
  pg: "supabase",
  mongodb: "mongodb",
  mongo: "mongodb",
  mongoose: "mongodb",
  firebase: "firebase",
  firestore: "firebase"
};

function toBoolean(value, defaultValue = false) {
  if (value === undefined) {
    return defaultValue;
  }

  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

function normalizeProvider(value, fallback = "memory") {
  if (!value) {
    return fallback;
  }

  return providerAliases[value.trim().toLowerCase()] ?? value.trim().toLowerCase();
}

export function getRuntimeSettings() {
  const dbProvider = normalizeProvider(process.env.DB_PROVIDER, "memory");
  const dbFallbackProvider = normalizeProvider(process.env.DB_FALLBACK_PROVIDER, "memory");
  const dbStrict = toBoolean(process.env.DB_STRICT, false);
  const authModeRaw = (process.env.AUTH_MODE ?? "auto").trim().toLowerCase();

  const authMode =
    authModeRaw === "auto" ? (dbProvider === "supabase" ? "supabase" : "dev") : authModeRaw;

  return {
    dbProvider,
    dbFallbackProvider,
    dbStrict,
    authMode,
    devAuthUserId: process.env.DEV_AUTH_USER_ID ?? "local-dev-user",
    devAuthEmail: process.env.DEV_AUTH_EMAIL ?? "dev@local.test",
    devAuthToken: process.env.DEV_AUTH_TOKEN ?? "dev-token"
  };
}
