/**
 * operatorDetection — détection de l'opérateur télécom de la SIM active.
 *
 * Permet de pré-filtrer les services USSD pertinents (un user Yas n'a
 * pas besoin de voir les services Moov en premier).
 *
 * Retourne un id normalisé : 'yas' | 'moov' | 'unknown'.
 */

import * as Cellular from 'expo-cellular';

// Mapping carrier name → id normalisé.
// Les noms commerciaux varient (Yas, Togocom, Moov Africa, etc.).
const CARRIER_MAP = [
  { match: /yas|togocom/i,         id: 'yas',  label: 'Yas (Togocom)' },
  { match: /moov/i,                id: 'moov', label: 'Moov' },
  { match: /orange/i,              id: 'orange', label: 'Orange' },
  { match: /mtn/i,                 id: 'mtn',  label: 'MTN' },
];

/**
 * Détecte l'opérateur de la SIM active.
 * @returns {Promise<{ id: string, label: string }>}
 */
export async function detectOperator() {
  try {
    const name = await Cellular.getCarrierNameAsync();
    if (!name) return { id: 'unknown', label: 'Opérateur non détecté' };

    for (const { match, id, label } of CARRIER_MAP) {
      if (match.test(name)) return { id, label };
    }
    return { id: 'unknown', label: name };
  } catch (e) {
    return { id: 'unknown', label: 'Opérateur non détecté' };
  }
}

/**
 * Renvoie true si l'utilisateur a une SIM active.
 */
export async function hasSIM() {
  try {
    const allowsVoip = await Cellular.allowsVoipAsync();
    const carrier   = await Cellular.getCarrierNameAsync();
    return !!carrier || allowsVoip === true;
  } catch {
    return false;
  }
}
