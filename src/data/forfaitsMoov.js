/**
 * Catalogue détaillé des forfaits Moov Africa (Flooz) — Togo.
 *
 * ⚠️  Codes USSD à valider en réel.
 *     Pattern usuel : *155*4*forfait_id*PIN#
 */

import { FORFAIT_TABS } from './forfaitsYas';

export { FORFAIT_TABS };

export const FORFAITS_MOOV = [
  // ─────── DATA ───────
  { id: 'moov-data-50mo',    tab: 'data', label: '50 Mo',           price: 100,  validity: '1 jour',        ussdTemplate: '*155*4*1*1*{pin}#', needsValidation: true },
  { id: 'moov-data-150mo',   tab: 'data', label: '150 Mo',          price: 200,  validity: '1 jour',        ussdTemplate: '*155*4*1*2*{pin}#', needsValidation: true },
  { id: 'moov-data-500mo',   tab: 'data', label: '500 Mo',          price: 500,  validity: '3 jours',       ussdTemplate: '*155*4*1*3*{pin}#', needsValidation: true },
  { id: 'moov-data-1g',      tab: 'data', label: '1 Go',            price: 1000, validity: '7 jours',       ussdTemplate: '*155*4*1*4*{pin}#', needsValidation: true },
  { id: 'moov-data-2g5',     tab: 'data', label: '2,5 Go',          price: 2000, validity: '15 jours',      ussdTemplate: '*155*4*1*5*{pin}#', needsValidation: true },
  { id: 'moov-data-5g',      tab: 'data', label: '5 Go',            price: 3000, validity: '30 jours',      ussdTemplate: '*155*4*1*6*{pin}#', needsValidation: true },
  { id: 'moov-data-10g',     tab: 'data', label: '10 Go',           price: 5000, validity: '30 jours',      ussdTemplate: '*155*4*1*7*{pin}#', needsValidation: true },
  { id: 'moov-data-25g',     tab: 'data', label: '25 Go',           price: 10000,validity: '30 jours',      ussdTemplate: '*155*4*1*8*{pin}#', needsValidation: true },

  // ─────── APPEL ───────
  { id: 'moov-appel-10min',  tab: 'appel', label: '10 minutes',     price: 150,  validity: '1 jour',        ussdTemplate: '*155*4*2*1*{pin}#', needsValidation: true },
  { id: 'moov-appel-30min',  tab: 'appel', label: '30 minutes',     price: 400,  validity: '3 jours',       ussdTemplate: '*155*4*2*2*{pin}#', needsValidation: true },
  { id: 'moov-appel-1h',     tab: 'appel', label: '1 heure',        price: 700,  validity: '7 jours',       ussdTemplate: '*155*4*2*3*{pin}#', needsValidation: true },

  // ─────── MIXTE ───────
  { id: 'moov-mixte-1',      tab: 'mixte', label: '300 Mo + 30 min',price: 500,  validity: '3 jours',       ussdTemplate: '*155*4*3*1*{pin}#', needsValidation: true },
  { id: 'moov-mixte-2',      tab: 'mixte', label: '1 Go + 60 min',  price: 1000, validity: '7 jours',       ussdTemplate: '*155*4*3*2*{pin}#', needsValidation: true },
  { id: 'moov-mixte-3',      tab: 'mixte', label: '5 Go + Illim.',  price: 5000, validity: '30 jours',      ussdTemplate: '*155*4*3*3*{pin}#', needsValidation: true },

  // ─────── PROMO ───────
  { id: 'moov-promo-1',      tab: 'promo', label: 'Pack Tonus',     price: 200,  validity: '1 jour',        ussdTemplate: '*155*4*4*1*{pin}#', needsValidation: true, extraInfo: 'Bonus 200%' },
  { id: 'moov-promo-2',      tab: 'promo', label: 'Pack Soirée',    price: 500,  validity: 'Soir uniquement',ussdTemplate: '*155*4*4*2*{pin}#', needsValidation: true },
];

export function getMoovForfaitsByTab(tabId) {
  return FORFAITS_MOOV.filter((f) => f.tab === tabId);
}

export function getMoovForfait(id) {
  return FORFAITS_MOOV.find((f) => f.id === id) ?? null;
}
