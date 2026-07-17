/**
 * ussdHelper — envoi de codes USSD à la SIM.
 *
 * Android : essai en 1-clic via `Intent.ACTION_CALL` (permission CALL_PHONE).
 * Si l'utilisateur refuse la permission ou si ACTION_CALL échoue, fallback
 * sur `ACTION_DIAL` (dialer pré-rempli, l'user appuie sur le bouton vert).
 *
 * iOS : pas d'équivalent à ACTION_CALL, on garde `Linking.openURL('tel:...')`.
 * Web : alerte d'indisponibilité.
 *
 * Encodage : le caractère `#` est obligatoirement encodé en `%23` dans
 * l'URI `tel:`, sinon le dialer s'ouvre vide.
 */

import { Linking, Platform, Alert, PermissionsAndroid } from 'react-native';
import * as IntentLauncher from 'expo-intent-launcher';

/**
 * Construit l'URL `tel:` correctement encodée pour un code USSD.
 *   buildTelUrl('*144*1#') → 'tel:*144*1%23'
 */
export function buildTelUrl(ussd) {
  const encoded = String(ussd).replace(/#/g, '%23');
  return `tel:${encoded}`;
}

/**
 * Remplace les paramètres {key} dans un template USSD par leurs valeurs.
 *   resolveUSSD('*124*{code}#', { code: '1234' }) → '*124*1234#'
 */
export function resolveUSSD(template, values = {}) {
  return String(template).replace(/\{(\w+)\}/g, (_, key) => values[key] ?? '');
}

/**
 * Envoie le code USSD à la SIM. Retourne true si l'intent a bien été lancé.
 *
 * Sur Android :
 *   1. Demande la permission CALL_PHONE
 *   2. Si accordée → ACTION_CALL (USSD envoyé direct, popup système avec la réponse)
 *   3. Si refusée ou erreur → fallback ACTION_DIAL (dialer pré-rempli)
 */
export async function dialUSSD(ussd) {
  if (Platform.OS === 'web') {
    Alert.alert(
      'Disponible sur mobile uniquement',
      `Cette fonctionnalité nécessite une carte SIM.\n\nCode : ${ussd}`,
    );
    return false;
  }

  const url = buildTelUrl(ussd);

  // iOS : pas d'ACTION_CALL équivalent → ouverture du dialer classique
  if (Platform.OS === 'ios') {
    try {
      await Linking.openURL(url);
      return true;
    } catch {
      Alert.alert('Erreur', `Compose manuellement : ${ussd}`);
      return false;
    }
  }

  // Android : on tente ACTION_CALL (1-clic), fallback ACTION_DIAL (3-clics)
  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.CALL_PHONE,
      {
        title: 'Autoriser l\'envoi de codes USSD',
        message:
          'LikaPay envoie les codes USSD directement à ta SIM pour un raccourci instantané. Aucun appel téléphonique ne sera passé sans ton action.',
        buttonPositive: 'Autoriser',
        buttonNegative: 'Refuser',
      },
    );

    if (granted === PermissionsAndroid.RESULTS.GRANTED) {
      await IntentLauncher.startActivityAsync('android.intent.action.CALL', {
        data: url,
      });
      return true;
    }

    // Permission refusée → fallback dialer classique
    await Linking.openURL(url);
    return true;
  } catch (e) {
    // Erreur ACTION_CALL (ex : SIM absente) → fallback dialer classique
    try {
      await Linking.openURL(url);
      return true;
    } catch {
      Alert.alert('Erreur', `Compose manuellement : ${ussd}`);
      return false;
    }
  }
}
