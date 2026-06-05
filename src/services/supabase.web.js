import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL      = process.env.EXPO_PUBLIC_SUPABASE_URL      ?? 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? 'your-anon-key';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage:            localStorage,
    autoRefreshToken:   true,
    persistSession:     true,
    detectSessionInUrl: false,
  },
});

export async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw new Error(error.message);
  return data.user;
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  return data.user;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// ── Google OAuth (web) ─────────────────────────────────────────────────────

/**
 * Connexion / inscription via Google sur le web : redirige la page vers Google,
 * puis revient sur l'origine. La session est récupérée par bootstrapOAuthFromUrl
 * au rechargement de l'app.
 */
export async function signInWithGoogle() {
  const redirectTo = (typeof window !== 'undefined' && window.location?.origin)
    ? window.location.origin
    : undefined;
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo },
  });
  if (error) throw new Error(error.message);
  // La navigation se poursuit après la redirection du navigateur.
  return null;
}

/**
 * Au retour de Google, les tokens sont dans le fragment de l'URL
 * (#access_token=…&refresh_token=…). On pose la session puis on nettoie l'URL.
 * Appelé par AppNavigator au démarrage. detectSessionInUrl reste à false pour
 * ne pas interférer avec le flux de récupération de mot de passe.
 */
export async function bootstrapOAuthFromUrl() {
  if (typeof window === 'undefined' || !window.location?.hash) return null;

  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const access_token  = hash.get('access_token');
  const refresh_token = hash.get('refresh_token');
  const type          = hash.get('type');

  // On laisse le flux de récupération de mot de passe à detectSessionInUrl/PASSWORD_RECOVERY.
  if (!access_token || type === 'recovery') return null;

  const { data, error } = await supabase.auth.setSession({ access_token, refresh_token });
  if (error) throw new Error(error.message);

  // Nettoie le fragment pour éviter de re-traiter au prochain rechargement.
  window.history.replaceState(null, '', window.location.pathname + window.location.search);
  return data.session;
}

export async function resetPassword(email) {
  const redirectTo = (typeof window !== 'undefined' && window.location?.origin)
    ? window.location.origin
    : undefined;
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw new Error(error.message);
}

export async function sendPhoneOTP(phoneE164) {
  const { error } = await supabase.auth.signInWithOtp({ phone: phoneE164 });
  if (error) throw new Error(error.message);
}

export async function verifyPhoneOTP(phoneE164, token) {
  const { data, error } = await supabase.auth.verifyOtp({
    phone: phoneE164,
    token,
    type: 'sms',
  });
  if (error) throw new Error(error.message);
  return data.user;
}
