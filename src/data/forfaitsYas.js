/**
 * Catalogue forfaits Yas — généré depuis yas_mixx_ussd_config.json.
 *
 * Les codes Net sont des EXPRESS (sans PIN ni params) — tap → dial direct (1-clic).
 * Mise à jour du catalogue : éditer yas_mixx_ussd_config.json, rebuild.
 *
 * Forfaits Ovo (mixte) et Léma (voix) : seuls les menus racine sont dans le JSON
 * pour l'instant. Le catalogue détaillé arrivera quand l'utilisateur le complétera.
 */

import { getYasForfaits } from './yasAdapter';

export const FORFAIT_TABS = [
  { id: 'data',   label: 'DATA' },
  { id: 'appel',  label: 'APPEL' },
  { id: 'mixte',  label: 'MIXTE' },
  { id: 'promo',  label: 'PROMO' },
];

export const FORFAITS_YAS = getYasForfaits();

export function getYasForfaitsByTab(tabId) {
  return FORFAITS_YAS.filter((f) => f.tab === tabId);
}

export function getYasForfait(id) {
  return FORFAITS_YAS.find((f) => f.id === id) ?? null;
}
