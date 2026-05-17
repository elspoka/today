import { getSupabaseClients } from "./providers/supabase.js";

export function createAuthMiddleware(settings) {
  if (settings.authMode === "supabase") {
    return async function requireAuth(req, res, next) {
      let supabaseAuthClient;

      try {
        ({ supabaseAuthClient } = getSupabaseClients());
      } catch (error) {
        return res.status(500).json({ error: `Auth configuration error: ${error.message}` });
      }

      const authorization = req.headers.authorization;

      if (!authorization || !authorization.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Missing bearer token" });
      }

      const token = authorization.slice(7);
      const { data, error } = await supabaseAuthClient.auth.getUser(token);

      if (error || !data.user) {
        return res.status(401).json({ error: "Invalid token" });
      }

      req.user = {
        id: data.user.id,
        email: data.user.email
      };

      return next();
    };
  }

  if (settings.authMode === "dev") {
    return async function requireDevAuth(req, res, next) {
      const authorization = req.headers.authorization;
      const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : "";

      if (token && token !== settings.devAuthToken) {
        return res.status(401).json({ error: "Invalid dev token" });
      }

      req.user = {
        id: settings.devAuthUserId,
        email: settings.devAuthEmail
      };

      return next();
    };
  }

  throw new Error(`Unsupported AUTH_MODE: ${settings.authMode}`);
}
