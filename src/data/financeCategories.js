/**
 * Catalogue statique des catégories de finances personnelles.
 *
 * Chaque catégorie : { id, label, icon (clé lucide), color, bg }.
 * Les écrans mappent `icon` → composant lucide (comme ServicesScreen).
 *
 * Country-agnostic : aucune dépendance opérateur/pays.
 */

import { TX_TYPE } from '../theme';

// ── Catégorie réservée aux mouvements d'épargne (coffres bloqués) ──────────
export const SAVINGS_CATEGORY_ID = 'epargne';

export const CATEGORIES = [
  { id: 'alimentation', label: 'Alimentation', icon: 'shopping-cart', color: '#16A34A', bg: '#DCFCE7' },
  { id: 'transport',    label: 'Transport',    icon: 'bus',           color: '#2563EB', bg: '#DBEAFE' },
  { id: 'factures',     label: 'Factures',     icon: 'file-text',     color: '#0891B2', bg: '#CFFAFE' },
  { id: 'sante',        label: 'Santé',        icon: 'heart-pulse',   color: '#DC2626', bg: '#FEE2E2' },
  { id: 'education',    label: 'Éducation',    icon: 'graduation-cap',color: '#7C3AED', bg: '#EDE9FE' },
  { id: 'loisirs',      label: 'Loisirs',      icon: 'party-popper',  color: '#DB2777', bg: '#FCE7F3' },
  { id: 'transferts',   label: 'Transferts',   icon: 'arrow-left-right', color: '#D69E4E', bg: '#FBF3E4' },
  { id: SAVINGS_CATEGORY_ID, label: 'Épargne', icon: 'piggy-bank',    color: '#0F766E', bg: '#CCFBF1' },
  { id: 'revenus',      label: 'Revenus',      icon: 'trending-up',   color: '#15803D', bg: '#DCFCE7' },
  { id: 'autre',        label: 'Autre',        icon: 'tag',           color: '#6B7280', bg: '#F3F4F6' },
];

const _byId = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));

export function getCategory(id) {
  return _byId[id] ?? _byId.autre;
}

export function getCategories() {
  return CATEGORIES;
}

// ── Catégorie par défaut selon le type de transaction ──────────────────────
export const DEFAULT_CATEGORY_BY_TXTYPE = {
  [TX_TYPE.COLLECT]:  'revenus',
  [TX_TYPE.TOPUP]:    'revenus',
  [TX_TYPE.TRANSFER]: 'transferts',
  [TX_TYPE.WITHDRAW]: 'autre',
};

// ── Devine une catégorie à partir d'un libellé (mots-clés) ─────────────────
const KEYWORDS = [
  ['alimentation', ['marché', 'marche', 'nourriture', 'resto', 'restaurant', 'repas', 'boutique', 'épicerie', 'epicerie', 'pain']],
  ['transport',    ['taxi', 'bus', 'moto', 'zem', 'essence', 'carburant', 'transport', 'voyage', 'ticket']],
  ['factures',     ['facture', 'ceet', 'tde', 'eau', 'électricité', 'electricite', 'canal', 'internet', 'wifi', 'abonnement']],
  ['sante',        ['pharmacie', 'hôpital', 'hopital', 'clinique', 'médecin', 'medecin', 'santé', 'sante', 'soins']],
  ['education',    ['école', 'ecole', 'université', 'universite', 'scolarité', 'scolarite', 'frais', 'inscription', 'fourniture']],
  ['loisirs',      ['cinéma', 'cinema', 'jeu', 'sortie', 'bar', 'fête', 'fete', 'loisir', 'sport']],
  ['transferts',  ['transfert', 'envoi', 'reliquat', 'envoyé', 'envoye']],
  ['epargne',      ['épargne', 'epargne', 'coffre', 'cotisation']],
];

export function guessCategory(description = '', txType = null) {
  const d = String(description).toLowerCase();
  for (const [catId, words] of KEYWORDS) {
    if (words.some((w) => d.includes(w))) return catId;
  }
  if (txType && DEFAULT_CATEGORY_BY_TXTYPE[txType]) return DEFAULT_CATEGORY_BY_TXTYPE[txType];
  return 'autre';
}
