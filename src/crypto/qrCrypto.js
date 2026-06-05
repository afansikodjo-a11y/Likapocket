/**
 * QR payload format:  <AES-256-CBC ciphertext (base64)>.<HMAC-SHA256 (hex)>
 *
 * The dot is safe as a separator because AES base64 only uses A-Z a-z 0-9 +/=
 * while the HMAC uses 0-9 a-f — neither contains a dot.
 *
 * Security model (offline peer-to-peer):
 *   - Both sides share APP_KEY embedded in the app bundle.
 *   - HMAC prevents any tampering with the ciphertext.
 *   - AES hides the payload from casual inspection / QR screenshots.
 *   - Timestamp + nonce stop replay and expiry attacks.
 */

import CryptoJS from 'crypto-js';
import * as Crypto from 'expo-crypto';

// Shared symmetric key — same for every Lika installation.
// In a production system this would be a server-issued session key or PKI.
const APP_KEY = 'Lika_QR_2024_S3cur3_K3y_v1_xK9mP';

/** QR codes are valid for 2 minutes after generation. */
export const QR_TTL_MS = 2 * 60 * 1000;

/**
 * Hard cap on the amount a single QR (a single "block") may carry.
 * No user can generate one block worth more than 4 900 F.
 */
export const MAX_QR_AMOUNT = 4900;

// ---------------------------------------------------------------------------
// Encrypt — called by the merchant
// ---------------------------------------------------------------------------

/**
 * Builds an encrypted, HMAC-signed QR string from a payment payload.
 *
 * @param {{merchantId:string, merchantName:string, amount:number, currency?:string}} opts
 * @returns {Promise<{ qr: string, nonce: string }>} QR string + the nonce used (caller may need it for debit tracking).
 */
export async function encryptQRPayload({ merchantId, merchantName, amount, currency = 'CFA' }) {
  if (!merchantId || typeof amount !== 'number' || amount <= 0) {
    throw new Error('Paramètres invalides pour la génération du QR.');
  }
  if (amount > MAX_QR_AMOUNT) {
    throw new Error(`Montant maximum par QR : ${MAX_QR_AMOUNT.toLocaleString('fr-FR')} F.`);
  }

  // 8-byte random nonce (16 hex chars) — prevents replay within the TTL window
  const nonceBytes = await Crypto.getRandomBytesAsync(8);
  const nonce = Array.from(nonceBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const payload = {
    mid:   merchantId,
    mname: merchantName || merchantId,
    amt:   amount,
    cur:   currency,
    ts:    Date.now(),
    nonce,
    v:     1,
  };

  const encrypted = CryptoJS.AES.encrypt(
    JSON.stringify(payload),
    APP_KEY,
  ).toString(); // base64

  const hmac = CryptoJS.HmacSHA256(encrypted, APP_KEY).toString(CryptoJS.enc.Hex);

  return { qr: `${encrypted}.${hmac}`, nonce };
}

// ---------------------------------------------------------------------------
// Decrypt — called by the client
// ---------------------------------------------------------------------------

/**
 * Verifies and decrypts a QR string produced by encryptQRPayload.
 *
 * Throws a user-readable error on any security or format failure.
 *
 * @param {string} qrString
 * @returns {{ mid, mname, amt, cur, ts, nonce, v }} Verified payload
 */
export function decryptQRPayload(qrString) {
  if (typeof qrString !== 'string' || !qrString.includes('.')) {
    throw new Error('QR non reconnu : format incorrect.');
  }

  const dotIndex = qrString.lastIndexOf('.');
  const encrypted    = qrString.substring(0, dotIndex);
  const receivedHmac = qrString.substring(dotIndex + 1);

  // ── 1. Integrity ──────────────────────────────────────────────────────────
  const expectedHmac = CryptoJS.HmacSHA256(encrypted, APP_KEY).toString(CryptoJS.enc.Hex);
  if (receivedHmac !== expectedHmac) {
    throw new Error('QR invalide : la signature ne correspond pas.');
  }

  // ── 2. Decryption ─────────────────────────────────────────────────────────
  let payload;
  try {
    const bytes     = CryptoJS.AES.decrypt(encrypted, APP_KEY);
    const plaintext = bytes.toString(CryptoJS.enc.Utf8);
    if (!plaintext) throw new Error();
    payload = JSON.parse(plaintext);
  } catch {
    throw new Error('Impossible de déchiffrer le QR. Clé invalide.');
  }

  // ── 3. Schema ─────────────────────────────────────────────────────────────
  const { mid, mname, amt, ts, nonce, v } = payload;
  if (!mid || !amt || !ts || !nonce || v !== 1) {
    throw new Error('QR invalide : données manquantes ou version incompatible.');
  }

  // ── 4. Expiry ─────────────────────────────────────────────────────────────
  const age = Date.now() - ts;
  if (age > QR_TTL_MS) {
    const mins = Math.floor(age / 60000);
    throw new Error(`QR expiré (généré il y a ${mins} min). Demandez un nouveau code.`);
  }
  if (age < -30_000) {
    // Clock skew > 30 s — possible replay from the future
    throw new Error('Horodatage du QR invalide. Vérifiez l\'heure de l\'appareil.');
  }

  // ── 5. Amount sanity ──────────────────────────────────────────────────────
  if (typeof amt !== 'number' || amt <= 0 || !isFinite(amt)) {
    throw new Error('Montant invalide dans le QR.');
  }
  if (amt > MAX_QR_AMOUNT) {
    throw new Error(`QR invalide : montant supérieur au plafond de ${MAX_QR_AMOUNT.toLocaleString('fr-FR')} F.`);
  }

  return payload;
}
