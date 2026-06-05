import { Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import * as QueryParams from 'expo-auth-session/build/QueryParams';

// Permet à la fenêtre OAuth de se refermer proprement (no-op sur natif, requis sur web).
WebBrowser.maybeCompleteAuthSession();

// Deep link de retour après authentification Google (ex: likapocket://auth-callback).
// ⚠️ À ajouter dans Supabase → Authentication → URL Configuration → Redirect URLs.
const OAUTH_REDIRECT = makeRedirectUri({ scheme: 'likapocket', path: 'auth-callback' });

// ── Credentials ────────────────────────────────────────────────────────────
const SUPABASE_URL      = process.env.EXPO_PUBLIC_SUPABASE_URL      ?? 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? 'your-anon-key';

// ── Storage adapter — SecureStore on native, localStorage on web ───────────
function buildStorageAdapter() {
  if (Platform.OS === 'web') {
    return {
      getItem:    (key)        => Promise.resolve(localStorage.getItem(key)),
      setItem:    (key, value) => Promise.resolve(localStorage.setItem(key, value)),
      removeItem: (key)        => Promise.resolve(localStorage.removeItem(key)),
    };
  }
  // Native: lazy-require so the web bundle never loads expo-secure-store
  const SecureStore = require('expo-secure-store');
  return {
    getItem:    (key)        => SecureStore.getItemAsync(key),
    setItem:    (key, value) => SecureStore.setItemAsync(key, value),
    removeItem: (key)        => SecureStore.deleteItemAsync(key),
  };
}

// ── Client ─────────────────────────────────────────────────────────────────
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage:            buildStorageAdapter(),
    autoRefreshToken:   true,
    persistSession:     true,
    detectSessionInUrl: false,
  },
});

// ── Auth helpers ───────────────────────────────────────────────────────────

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

// ── Google OAuth (natif) ───────────────────────────────────────────────────

/**
 * Reconstruit une session Supabase à partir de l'URL de retour OAuth
 * (les tokens arrivent dans le fragment en flow implicite).
 */
async function createSessionFromUrl(url) {
  const { params, errorCode } = QueryParams.getQueryParams(url);
  if (errorCode) throw new Error(errorCode);

  const { access_token, refresh_token } = params;
  if (!access_token) return null;

  const { data, error } = await supabase.auth.setSession({ access_token, refresh_token });
  if (error) throw new Error(error.message);
  return data.session;
}

/**
 * Connexion / inscription via Google.
 * Ouvre le navigateur système, attend le retour deep-link, puis pose la session.
 * `onAuthStateChange` (AppNavigator) prend ensuite le relais pour la navigation.
 *
 * @returns {Promise<import('@supabase/supabase-js').Session|null>} session, ou null si l'utilisateur annule.
 */
export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: OAUTH_REDIRECT, skipBrowserRedirect: true },
  });
  if (error) throw new Error(error.message);
  if (!data?.url) throw new Error('Impossible de démarrer la connexion Google.');

  const result = await WebBrowser.openAuthSessionAsync(data.url, OAUTH_REDIRECT);

  if (result.type === 'success') {
    return await createSessionFromUrl(result.url);
  }
  // 'cancel' / 'dismiss' → l'utilisateur a fermé la fenêtre : pas d'erreur.
  return null;
}

/**
 * Sur natif, le retour OAuth est géré en ligne par signInWithGoogle :
 * ce point d'entrée (utilisé par AppNavigator) n'a donc rien à faire.
 * La version web (supabase.web.js) le surcharge.
 */
export async function bootstrapOAuthFromUrl() {
  return null;
}

/**
 * Envoie un email de réinitialisation de mot de passe.
 * Sur web, redirige vers la même origine (qui va capter le token et afficher
 * le ResetPasswordScreen via l'événement PASSWORD_RECOVERY).
 */
export async function resetPassword(email) {
  const redirectTo = (typeof window !== 'undefined' && window.location?.origin)
    ? window.location.origin
    : undefined;
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw new Error(error.message);
}

// ── Phone / OTP auth ───────────────────────────────────────────────────────

/**
 * Sends a 6-digit OTP to the given E.164 phone number (e.g. "+221771234567").
 * Requires Phone provider configured in Supabase Dashboard.
 */
export async function sendPhoneOTP(phoneE164) {
  const { error } = await supabase.auth.signInWithOtp({ phone: phoneE164 });
  if (error) throw new Error(error.message);
}

/**
 * Verifies the OTP received by SMS and signs the user in.
 * Returns the authenticated user.
 */
export async function verifyPhoneOTP(phoneE164, token) {
  const { data, error } = await supabase.auth.verifyOtp({
    phone: phoneE164,
    token,
    type: 'sms',
  });
  if (error) throw new Error(error.message);
  return data.user;
}
