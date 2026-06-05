/**
 * Coordonnées de l'administrateur pour les opérations manuelles
 * (recharge interne / retrait via WhatsApp).
 *
 * Plus tard : remplacer par les vraies API Moneroo / Mobile Money.
 */

import { Linking, Platform, Alert } from 'react-native';

// Numéro WhatsApp de l'admin (format international, sans + ni espaces)
export const ADMIN_WHATSAPP = '22891282590';

// Email de contact (pour affichage uniquement)
export const ADMIN_EMAIL = 'namatech01@gmail.com';

// Société éditrice / développeur
export const COMPANY_NAME = 'NAMATECH';

/**
 * Ouvre une discussion WhatsApp avec l'admin, message pré-rempli.
 *
 * Stratégie :
 *   1. On essaie le scheme natif WhatsApp `whatsapp://send` (plus fiable sur Android 11+)
 *   2. Si échec, on tombe sur `https://wa.me/...` (ouvre le navigateur qui redirige)
 *   3. Si tout échoue, on affiche un alert avec le numéro à composer manuellement
 *
 * On NE PAS utiliser `canOpenURL` car Android 11+ le bloque pour HTTPS
 * (privacy restriction). On try / catch directement.
 */
export async function openWhatsAppToAdmin(message) {
  const encoded = encodeURIComponent(message);

  const nativeUrl = `whatsapp://send?phone=${ADMIN_WHATSAPP}&text=${encoded}`;
  const webUrl    = `https://wa.me/${ADMIN_WHATSAPP}?text=${encoded}`;

  // Sur web, on va direct vers wa.me (whatsapp:// n'est pas géré)
  if (Platform.OS === 'web') {
    try { await Linking.openURL(webUrl); }
    catch {
      Alert.alert('Erreur', `Contactez l'admin au +${ADMIN_WHATSAPP}.`);
    }
    return;
  }

  // Sur Android/iOS : try native scheme → fallback web
  try {
    await Linking.openURL(nativeUrl);
    return;
  } catch (_) {
    // ignore et essaie l'URL web
  }

  try {
    await Linking.openURL(webUrl);
  } catch (_) {
    Alert.alert(
      'WhatsApp introuvable',
      `Installez WhatsApp ou contactez directement l'admin au +${ADMIN_WHATSAPP}.`,
    );
  }
}

// Bloc d'identité commun pour les deux types de messages.
function _buildIdentityBlock({ requestId, fullName, userEmail, userPhone, country }) {
  const shortId = (requestId ?? '').slice(0, 8);
  const lines = [`📎 Référence : #${shortId}`];

  if (fullName)  lines.push(`👤 ${fullName}`);
  if (userEmail) lines.push(`✉️ ${userEmail}`);
  if (userPhone) lines.push(`📞 ${userPhone}`);
  if (country)   lines.push(`🌍 ${country}`);

  return lines.join('\n');
}

/**
 * Compose le message à envoyer à l'admin pour une recharge interne.
 */
export function buildTopUpMessage({ amount, requestId, fullName, userEmail, userPhone, country }) {
  const identity = _buildIdentityBlock({ requestId, fullName, userEmail, userPhone, country });
  return (
    `Bonjour, je souhaite faire une *RECHARGE* de ${amount.toLocaleString('fr-FR')} F CFA sur LikaPocket.\n\n` +
    `${identity}\n\n` +
    `Merci de m'indiquer comment régler.`
  );
}

/**
 * Compose le message à envoyer à l'admin pour un retrait interne.
 */
export function buildWithdrawMessage({
  amount, requestId, fullName, userEmail, userPhone, country, destination,
}) {
  const identity = _buildIdentityBlock({ requestId, fullName, userEmail, userPhone, country });
  return (
    `Bonjour, je souhaite faire un *RETRAIT* de ${amount.toLocaleString('fr-FR')} F CFA depuis mon compte LikaPocket.\n\n` +
    `${identity}\n\n` +
    `💳 Numéro destinataire : ${destination ?? '(à préciser)'}\n` +
    `Merci de m'indiquer la procédure.`
  );
}
