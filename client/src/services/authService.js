import { supabase, supabaseConfigError } from "../providers/supabase.js";

export { supabaseConfigError };

function normalizeUser(rawUser) {
  if (!rawUser) return null;
  return {
    id: rawUser.id,
    email: rawUser.email
  };
}

export const authService = {
  async getSession() {
    if (!supabase) return { data: { session: null } };
    const result = await supabase.auth.getSession();
    return result;
  },

  async signIn(email, password) {
    if (!supabase) throw new Error(supabaseConfigError);
    return supabase.auth.signInWithPassword({ email, password });
  },

  async signUp(email, password) {
    if (!supabase) throw new Error(supabaseConfigError);
    return supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin }
    });
  },

  async signInWithFacebook() {
    if (!supabase) throw new Error(supabaseConfigError);
    return supabase.auth.signInWithOAuth({
      provider: "facebook",
      options: { redirectTo: window.location.origin }
    });
  },

  async signOut() {
    if (!supabase) return;
    return supabase.auth.signOut();
  },

  async getCurrentUser() {
    if (!supabase) return null;
    const { data } = await supabase.auth.getUser();
    return normalizeUser(data?.user);
  },

  async getAccessToken() {
    if (!supabase) return null;
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  },

  onAuthStateChange(callback) {
    if (!supabase) return { data: { subscription: null } };
    return supabase.auth.onAuthStateChange(callback);
  }
};
