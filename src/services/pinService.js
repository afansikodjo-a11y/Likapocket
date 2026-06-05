/**
 * pinService — gestion du code PIN local (hashé) + biométrie.
 *
 * Le PIN est stocké uniquement sous forme de hash SHA-256 dans SecureStore
 * (jamais en clair). La biométrie utilise expo-local-authentication
 * (Face ID / Touch ID / fingerprint).
 */

import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
import { saveSecureValue, getSecureValue, deleteSecureValue } from '../database';

const PIN_HASH_KEY      = 'user_pin_hash';
const BIOMETRIC_ENABLED = 'biometric_enabled';
const SALT              = 'lika::v1::';

// ── PIN ───────────────────────────────────────────────────────────────────

export async function hashPin(pin) {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${SALT}${pin}`,
  );
}

export async function setPin(pin) {
  if (!/^\d{4,6}$/.test(pin)) throw new Error('Le PIN doit comporter 4 à 6 chiffres.');
  const hash = await hashPin(pin);
  await saveSecureValue(PIN_HASH_KEY, hash);
}

export async function verifyPin(pin) {
  const stored = await getSecureValue(PIN_HASH_KEY);
  if (!stored) return false;
  const hash = await hashPin(pin);
  return hash === stored;
}

export async function isPinSet() {
  const stored = await getSecureValue(PIN_HASH_KEY);
  return !!stored;
}

export async function disablePin() {
  await deleteSecureValue(PIN_HASH_KEY);
  await deleteSecureValue(BIOMETRIC_ENABLED);
}

// ── Biométrie ─────────────────────────────────────────────────────────────

// Lazy-import : expo-local-authentication n'a pas de support web.
function _getLA() {
  if (Platform.OS === 'web') return null;
  try { return require('expo-local-authentication'); }
  catch { return null; }
}

export async function isBiometricAvailable() {
  const LA = _getLA();
  if (!LA) return false;
  try {
    const hasHw = await LA.hasHardwareAsync();
    if (!hasHw) return false;
    const enrolled = await LA.isEnrolledAsync();
    return enrolled;
  } catch {
    return false;
  }
}

export async function getBiometricLabel() {
  const LA = _getLA();
  if (!LA) return 'Biométrie';
  try {
    const types = await LA.supportedAuthenticationTypesAsync();
    if (types.includes(LA.AuthenticationType.FACIAL_RECOGNITION)) return 'Face ID';
    if (types.includes(LA.AuthenticationType.FINGERPRINT))        return 'Empreinte digitale';
    if (types.includes(LA.AuthenticationType.IRIS))               return 'Iris';
    return 'Biométrie';
  } catch {
    return 'Biométrie';
  }
}

export async function authenticateBiometric(reason = 'Déverrouiller LikaPocket') {
  const LA = _getLA();
  if (!LA) return false;
  try {
    const { success } = await LA.authenticateAsync({
      promptMessage:      reason,
      cancelLabel:        'Annuler',
      fallbackLabel:      'Utiliser le PIN',
      disableDeviceFallback: false,
    });
    return success;
  } catch {
    return false;
  }
}

export async function setBiometricEnabled(enabled) {
  if (enabled) await saveSecureValue(BIOMETRIC_ENABLED, '1');
  else         await deleteSecureValue(BIOMETRIC_ENABLED);
}

export async function isBiometricEnabled() {
  const v = await getSecureValue(BIOMETRIC_ENABLED);
  return v === '1';
}
