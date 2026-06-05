/**
 * Catalogue des services USSD pour le Togo (+228) — Schema v5.
 *
 * Services Yas → générés depuis yas_mixx_ussd_config.json via yasAdapter.js
 *   (l'utilisateur met à jour ce JSON, on rebuild, et tout suit).
 * Services Moov → hardcodés ici en attendant un fichier Moov officiel.
 * Services universels (operator: null) → hardcodés ici.
 *
 * Chaque service a un `kind` qui détermine l'écran qui s'ouvre quand
 * l'utilisateur tape dessus :
 *
 *   'simple-dial'      → dial direct (1-clic). Si needsPin: true, on demande le PIN
 *                        dans l'app (PinPromptDialog) avant de dialer le code complet.
 *   'transfer'         → TransferActionScreen — form num + montant + PIN + contacts
 *   'topup-code'       → CreditActionScreen — form code à gratter
 *   'topup-self'       → TopupSelfActionScreen — montant + PIN (achat crédit pour soi)
 *   'topup-other'      → TopupOtherActionScreen — numéro + montant + PIN (offrir du crédit)
 *   'forfait-purchase' → ForfaitActionScreen — sous-catalogue détaillé (DATA/APPEL/...)
 *   'bill-pay'         → BillActionScreen — form référence client + montant + PIN
 *   'merchant-pay'     → MerchantPayActionScreen — form code marchand + montant + PIN
 *   'cash-out'         → WithdrawActionScreen — form montant + PIN (retrait cash)
 *
 * ⚠️  Codes Moov toujours `needsValidation: true` (hypothèses). Codes Yas viennent
 *     du JSON officiel vérifié.
 */

import { getAllYasServices } from './yasAdapter';

// ── Catégories (pour le hub principal) ────────────────────────────────────

export const CATEGORIES = [
  {
    id:          'momo',
    label:       'Mobile Money',
    description: 'Solde, transfert, retrait, paiement',
    icon:        'wallet',
    color:       '#D69E4E',
    bg:          '#FBF3E4',
  },
  {
    id:          'credit',
    label:       'Crédit téléphone',
    description: 'Recharger ton compte avec un code à gratter',
    icon:        'phone-call',
    color:       '#1A7F4B',
    bg:          '#E6F4EE',
  },
  {
    id:          'forfait',
    label:       'Forfaits Internet',
    description: 'Acheter des forfaits Internet / SMS',
    icon:        'signal',
    color:       '#7C3AED',
    bg:          '#EDE9FE',
  },
  {
    id:          'facture',
    label:       'Factures',
    description: 'Électricité, eau, TV, Internet domicile',
    icon:        'file-text',
    color:       '#0066B3',
    bg:          '#CCE0F0',
  },
];

// ── Opérateurs (méta) ─────────────────────────────────────────────────────

export const OPERATORS = {
  yas:  { id: 'yas',  label: 'Yas (Togocom)', short: 'YAS',  color: '#FFB100' },
  moov: { id: 'moov', label: 'Moov Africa',   short: 'MOOV', color: '#0066B3' },
};

// ── Services Moov (hardcodés — codes à valider en réel) ──────────────────

const MOOV_SERVICES = [
  {
    id: 'moov-momo-menu',
    category: 'momo', operator: 'moov',
    kind: 'simple-dial',
    label: 'Menu Flooz Moov',
    description: 'Ouvre le menu Mobile Money Moov complet',
    ussd: '*155#',
    params: [],
  },
  {
    id: 'moov-momo-transfer',
    category: 'momo', operator: 'moov',
    kind: 'transfer',
    label: 'Transfert d\'argent Flooz',
    description: 'Envoyer de l\'argent à un autre numéro Flooz',
    // Format usuel Moov : *155*1*destinataire*montant*PIN#
    ussdTemplate: '*155*1*{phone}*{amount}*{pin}#',
    needsValidation: true,
  },
  {
    id: 'moov-forfaits',
    category: 'forfait', operator: 'moov',
    kind: 'forfait-purchase',
    label: 'Forfaits Moov',
    description: 'DATA, APPEL, MIXTE — paiement direct depuis ton crédit',
  },

  // ────────────────────────────────────────────────────────────────────────
  // ── Flooz Moov : codes directs (factures & services Togo) ──────────────
  // Ces codes ouvrent directement le sous-menu Flooz correspondant.
  // L'utilisateur navigue ensuite manuellement dans le menu USSD.
  // ────────────────────────────────────────────────────────────────────────

  // ── Eau & Électricité ──
  {
    id: 'moov-flooz-ceet',
    category: 'facture', operator: 'moov',
    kind: 'simple-dial',
    label: 'CEET (Électricité) — Flooz',
    description: 'Payer ta facture CEET via Flooz',
    ussd: '*155*4*1#',
    params: [], activated: true,
  },
  {
    id: 'moov-flooz-tde',
    category: 'facture', operator: 'moov',
    kind: 'simple-dial',
    label: 'TdE (Eau) — Flooz',
    description: 'Payer ta facture d\'eau TdE via Flooz',
    ussd: '*155*4*6#',
    params: [], activated: true,
  },
  {
    id: 'moov-flooz-cashpower-pay',
    category: 'facture', operator: 'moov',
    kind: 'simple-dial',
    label: 'Cash Power — Paiement',
    description: 'Recharger un compteur Cashpower CEET prépayé',
    ussd: '*155*4*5#',
    params: [], activated: true,
  },
  {
    id: 'moov-flooz-cashpower-duplicata',
    category: 'facture', operator: 'moov',
    kind: 'simple-dial',
    label: 'Cash Power — Duplicata',
    description: 'Obtenir un duplicata du code Cashpower',
    ussd: '*155*4*5#',
    params: [], activated: true,
  },

  // ── Assurance ──
  {
    id: 'moov-flooz-assurance',
    category: 'facture', operator: 'moov',
    kind: 'simple-dial',
    label: 'Assurance — Flooz',
    description: 'Paiement de prime d\'assurance via Flooz',
    ussd: '*155*4*3#',
    params: [], activated: true,
  },

  // ── Universités & Grandes Écoles ──
  {
    id: 'moov-flooz-ul-ancien',
    category: 'facture', operator: 'moov',
    kind: 'simple-dial',
    label: 'Université de Lomé — Ancien étudiant',
    description: 'Paiement des frais de scolarité (ancien étudiant)',
    ussd: '*155*4*2*1*1#',
    params: [], activated: true,
  },
  {
    id: 'moov-flooz-ul-nouveau',
    category: 'facture', operator: 'moov',
    kind: 'simple-dial',
    label: 'Université de Lomé — Nouvel étudiant',
    description: 'Paiement des frais de scolarité (nouvel étudiant)',
    ussd: '*155*4*2*1*2#',
    params: [], activated: true,
  },
  {
    id: 'moov-flooz-grandes-ecoles',
    category: 'facture', operator: 'moov',
    kind: 'simple-dial',
    label: 'Grandes Écoles',
    description: 'Paiement des frais des Grandes Écoles',
    ussd: '*155*4*2*2#',
    params: [], activated: true,
  },

  // ── Moov Postpaid ──
  {
    id: 'moov-flooz-postpaid-self',
    category: 'facture', operator: 'moov',
    kind: 'simple-dial',
    label: 'Moov Postpaid — Mon compte (sans facture)',
    description: 'Régler ton propre forfait postpaid Moov',
    ussd: '*155*4*4*1*1#',
    params: [], activated: true,
  },
  {
    id: 'moov-flooz-postpaid-other',
    category: 'facture', operator: 'moov',
    kind: 'simple-dial',
    label: 'Moov Postpaid — Autre compte (sans facture)',
    description: 'Régler le postpaid d\'un autre numéro Moov',
    ussd: '*155*4*4*1*2#',
    params: [], activated: true,
  },
  {
    id: 'moov-flooz-postpaid-bill',
    category: 'facture', operator: 'moov',
    kind: 'simple-dial',
    label: 'Moov Postpaid — Avec facture',
    description: 'Paiement avec référence de facture (ou enregistrement sans facture)',
    ussd: '*155*4*4*3#',
    params: [], activated: true,
  },

  // ── CanalBox ──
  {
    id: 'moov-flooz-canalbox-reabo',
    category: 'facture', operator: 'moov',
    kind: 'simple-dial',
    label: 'CanalBox — Réabonnement identique',
    description: 'Renouveler le même abonnement CanalBox',
    ussd: '*155*4*7*1#',
    params: [], activated: true,
  },
  {
    id: 'moov-flooz-canalbox-add',
    category: 'facture', operator: 'moov',
    kind: 'simple-dial',
    label: 'CanalBox — Mémoriser un numéro de box',
    description: 'Enregistrer un nouveau numéro de box CanalBox',
    ussd: '*155*4*7*2#',
    params: [], activated: true,
  },
  {
    id: 'moov-flooz-canalbox-remove',
    category: 'facture', operator: 'moov',
    kind: 'simple-dial',
    label: 'CanalBox — Supprimer un numéro',
    description: 'Supprimer un numéro de box mémorisé',
    ussd: '*155*4*7*3#',
    params: [], activated: true,
  },

  // ── Canal+ ──
  {
    id: 'moov-flooz-canalplus-reabo',
    category: 'facture', operator: 'moov',
    kind: 'simple-dial',
    label: 'Canal+ — Réabonnement identique',
    description: 'Renouveler la même formule Canal+',
    ussd: '*155*4*8*1*1#',
    params: [], activated: true,
  },
  {
    id: 'moov-flooz-canalplus-change',
    category: 'facture', operator: 'moov',
    kind: 'simple-dial',
    label: 'Canal+ — Changement de formule',
    description: 'Changer ta formule d\'abonnement Canal+',
    ussd: '*155*4*8*1*2#',
    params: [], activated: true,
  },
  {
    id: 'moov-flooz-canalplus-add',
    category: 'facture', operator: 'moov',
    kind: 'simple-dial',
    label: 'Canal+ — Enregistrer une nouvelle carte',
    description: 'Mémoriser un nouveau numéro de carte Canal+',
    ussd: '*155*4*8*1*3#',
    params: [], activated: true,
  },
  {
    id: 'moov-flooz-canalplus-remove',
    category: 'facture', operator: 'moov',
    kind: 'simple-dial',
    label: 'Canal+ — Supprimer une carte mémorisée',
    description: 'Supprimer une carte Canal+ enregistrée',
    ussd: '*155*4*8*1*4#',
    params: [], activated: true,
  },

  // ── New World TV ──
  {
    id: 'moov-flooz-nwtv-reabo',
    category: 'facture', operator: 'moov',
    kind: 'simple-dial',
    label: 'New World TV — Réabonnement identique',
    description: 'Renouveler la même formule New World TV',
    ussd: '*155*4*8*2*1#',
    params: [], activated: true,
  },
  {
    id: 'moov-flooz-nwtv-change',
    category: 'facture', operator: 'moov',
    kind: 'simple-dial',
    label: 'New World TV — Changement de formule',
    description: 'Changer ta formule New World TV',
    ussd: '*155*4*8*2*2#',
    params: [], activated: true,
  },
  {
    id: 'moov-flooz-nwtv-add',
    category: 'facture', operator: 'moov',
    kind: 'simple-dial',
    label: 'New World TV — Enregistrer une nouvelle carte',
    description: 'Mémoriser un nouveau numéro de carte New World TV',
    ussd: '*155*4*8*2*3#',
    params: [], activated: true,
  },
  {
    id: 'moov-flooz-nwtv-remove',
    category: 'facture', operator: 'moov',
    kind: 'simple-dial',
    label: 'New World TV — Supprimer un numéro',
    description: 'Supprimer un numéro New World TV mémorisé',
    ussd: '*155*4*8*2*4#',
    params: [], activated: true,
  },

  // ── Solaire ──
  {
    id: 'moov-flooz-solergie',
    category: 'facture', operator: 'moov',
    kind: 'simple-dial',
    label: 'Solaire — Solergie',
    description: 'Paiement Solergie via Flooz',
    ussd: '*155*4*9*1#',
    params: [], activated: true,
  },
  {
    id: 'moov-flooz-cizo-menu',
    category: 'facture', operator: 'moov',
    kind: 'simple-dial',
    label: 'Solaire — Cizo-Bboxx (menu)',
    description: 'Menu général Cizo-Bboxx',
    ussd: '*155*4*9*2#',
    params: [], activated: true,
  },
  {
    id: 'moov-flooz-cizo-self',
    category: 'facture', operator: 'moov',
    kind: 'simple-dial',
    label: 'Cizo-Bboxx — Pour soi',
    description: 'Recharger ton propre kit Cizo-Bboxx',
    ussd: '*155*4*9*2*1#',
    params: [], activated: true,
  },
  {
    id: 'moov-flooz-cizo-other',
    category: 'facture', operator: 'moov',
    kind: 'simple-dial',
    label: 'Cizo-Bboxx — Autre personne',
    description: 'Recharger le kit Cizo-Bboxx d\'un autre',
    ussd: '*155*4*9*2*2#',
    params: [], activated: true,
  },
  {
    id: 'moov-flooz-cizo-register',
    category: 'facture', operator: 'moov',
    kind: 'simple-dial',
    label: 'Cizo-Bboxx — Enregistrement de compte',
    description: 'Enregistrer un compte Cizo-Bboxx',
    ussd: '*155*4*9*2*3#',
    params: [], activated: true,
  },
  {
    id: 'moov-flooz-soleva-cizo',
    category: 'facture', operator: 'moov',
    kind: 'simple-dial',
    label: 'SOLEVA-CIZO',
    description: 'Paiement SOLEVA-CIZO via Flooz',
    ussd: '*155*4*9*4#',
    params: [], activated: true,
  },
  {
    id: 'moov-flooz-moon',
    category: 'facture', operator: 'moov',
    kind: 'simple-dial',
    label: 'MOON',
    description: 'Paiement MOON via Flooz',
    ussd: '*155*4*9*5#',
    params: [], activated: true,
  },
];

// ── Services universels (operator: null) ─────────────────────────────────
//
// Les factures sont universelles : elles fonctionnent via Mobile Money quelle
// que soit la SIM (Yas ou Moov). BillActionScreen détecte la SIM et choisit le
// template dans BILL_SERVICES.
// Chaque entrée porte son icône + couleur pour une lecture rapide dans la liste.

const UNIVERSAL_SERVICES = [
  // ── Blocs de factures (groupes) ─────────────────────────────────────
  {
    id:          'facture-group-eau-elec',
    category:    'facture',
    operator:    null,
    kind:        'bill-group',
    groupId:     'eau-electricite',
    label:       'Factures Eau et Électricité',
    description: 'CEET (électricité) et TdE (eau)',
    icon:        'zap',
    color:       '#F59E0B',
    bg:          '#FEF3C7',
  },
  {
    id:          'facture-group-prepay',
    category:    'facture',
    operator:    null,
    kind:        'bill-group',
    groupId:     'compteurs-prepayes',
    label:       'Compteurs Prépayés',
    description: 'Cashpower, Lafia, Bboxx-EDL',
    icon:        'battery-charging',
    color:       '#10B981',
    bg:          '#D1FAE5',
  },

  // ── Services individuels (sans groupe) ──────────────────────────────
  {
    id:          'facture-canalplus',
    category:    'facture',
    operator:    null,
    kind:        'bill-pay',
    billType:    'CANAL_PLUS',
    label:       'Réabonnement Canal+',
    description: 'Renouveler ton abonnement Canal+ TV',
    icon:        'tv',
    color:       '#000000',
    bg:          '#E5E5E5',
  },
  {
    id:          'facture-canalbox',
    category:    'facture',
    operator:    null,
    kind:        'bill-pay',
    billType:    'CANAL_BOX',
    label:       'Recharger CanalBox',
    description: 'Renouveler ton Internet CanalBox',
    icon:        'wifi',
    color:       '#3B82F6',
    bg:          '#DBEAFE',
  },
];

// ── Catalogue final ──────────────────────────────────────────────────────

export const SERVICES = [
  ...getAllYasServices(),
  ...MOOV_SERVICES,
  ...UNIVERSAL_SERVICES,
];

// ── Helpers ───────────────────────────────────────────────────────────────

/**
 * Renvoie les services d'une catégorie filtrés strictement par SIM détectée.
 *
 *   - SIM inconnue ('unknown') ou web        → tous les services de la catégorie
 *   - SIM Yas/Moov détectée                  → uniquement services de cet opérateur
 *                                              + services universels (operator: null)
 */
export function getServicesByCategory(categoryId, simOperator = null) {
  const all = SERVICES.filter((s) => s.category === categoryId);
  if (!simOperator || simOperator === 'unknown') return all;
  return all.filter((s) => s.operator === simOperator || s.operator === null);
}

export function getCategory(id) {
  return CATEGORIES.find((c) => c.id === id) ?? null;
}

export function getOperator(id) {
  return OPERATORS[id] ?? null;
}

export function getService(id) {
  return SERVICES.find((s) => s.id === id) ?? null;
}

/**
 * Un service est "activé" (utilisable) si :
 *   - `activated: true` explicite
 *   OU
 *   - pas de flag `needsValidation` (= code validé par défaut, ex. codes du JSON Yas)
 *
 * Workflow : tant qu'on n'a pas testé un code en réel, il garde `needsValidation: true`
 * et s'affiche "Bientôt disponible". Quand l'utilisateur dit OK, on retire le flag.
 */
export function isServiceActivated(service) {
  if (!service) return false;
  if (service.activated === true) return true;
  if (service.activated === false) return false;
  return !service.needsValidation;
}
