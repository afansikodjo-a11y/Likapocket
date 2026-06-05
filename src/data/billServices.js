/**
 * Catalogue des fournisseurs de factures payables via Mobile Money — Togo.
 *
 * ⚠️  v5 : Les factures Yas sont désormais générées par yasAdapter à partir
 *     du JSON officiel (codes vérifiés : `*145*4*1#` CEET, `*145*4*2#` TdE,
 *     `*145*4*3#` Canal+). Ce sont des menus Mixx — l'utilisateur navigue
 *     dans le menu Yas qui s'ouvre. Pas de syntaxe directe disponible.
 *
 *     Ce fichier reste pour le canal Moov (templates non vérifiés, utilisés
 *     par BillActionScreen si l'utilisateur a une SIM Moov). Quand un fichier
 *     `moov_flooz_ussd_config.json` officiel sera fourni, ces entrées seront
 *     remplacées par un moovAdapter.
 */

export const BILL_SERVICES = {
  CEET: {
    id:          'CEET',
    label:       'CEET (Électricité)',
    description: 'Compagnie d\'Énergie Électrique du Togo',
    icon:        'zap',
    color:       '#F59E0B',
    bg:          '#FEF3C7',
    refLabel:    'Numéro de compteur',
    refPlaceholder: 'Ex: 12345678',
    refMaxLength: 12,
    // Format CEET postpaid : *145*4*1*1*ref*amount*pin# (validé)
    // (sous-menu CEET 1 = postpaid, sous-menu 2 = Cashpower prépayé)
    yas:  { ussdTemplate: '*145*4*1*1*{ref}*{amount}*{pin}#' },
    moov: { ussdTemplate: '*155*5*1*{ref}*{amount}*{pin}#', needsValidation: true },
  },

  TdE: {
    id:          'TdE',
    label:       'TdE (Eau)',
    description: 'Togolaise des Eaux',
    icon:        'droplet',
    color:       '#0EA5E9',
    bg:          '#CCE7F8',
    refLabel:    'Numéro d\'abonné TdE',
    refPlaceholder: 'Ex: 87654321',
    refMaxLength: 12,
    // Format TdE : *145*4*1*6*ref*amount*pin# (validé)
    yas:  { ussdTemplate: '*145*4*1*6*{ref}*{amount}*{pin}#' },
    moov: { ussdTemplate: '*155*5*2*{ref}*{amount}*{pin}#', needsValidation: true },
  },

  CANAL_PLUS: {
    id:          'CANAL_PLUS',
    label:       'Canal+',
    description: 'Abonnement Canal+ Togo',
    icon:        'tv',
    color:       '#000000',
    bg:          '#E5E5E5',
    refLabel:    'Numéro d\'abonné Canal+',
    refPlaceholder: 'Ex: 123456789',
    refMaxLength: 12,
    yas:  { ussdTemplate: '*145*4*3*{ref}*{amount}*{pin}#' },
    moov: { ussdTemplate: '*155*5*3*{ref}*{amount}*{pin}#', needsValidation: true },
  },

  CANAL_BOX: {
    id:          'CANAL_BOX',
    label:       'CanalBox (Internet)',
    description: 'Renouveler ton Internet CanalBox',
    icon:        'wifi',
    color:       '#3B82F6',
    bg:          '#DBEAFE',
    refLabel:    'Numéro de contrat CanalBox',
    refPlaceholder: 'Ex: CB12345',
    refMaxLength: 15,
    // Format CanalBox : *145*4*3*7*ref*amount*pin# (validé)
    yas:  { ussdTemplate: '*145*4*3*7*{ref}*{amount}*{pin}#' },
    moov: { ussdTemplate: '*155*5*4*{ref}*{amount}*{pin}#', needsValidation: true },
  },

  // ── Compteurs prépayés ─────────────────────────────────────────────────
  CASHPOWER: {
    id:          'CASHPOWER',
    label:       'Cashpower (CEET prépayé)',
    description: 'Recharge ton compteur électrique prépayé CEET',
    icon:        'battery-charging',
    color:       '#F59E0B',
    bg:          '#FEF3C7',
    refLabel:    'Numéro de compteur Cashpower',
    refPlaceholder: 'Ex: 12345678901',
    refMaxLength: 15,
    // Format Cashpower : *145*4*1*2*amount*ref*pin# (validé)
    // (sous-menu CEET prépayé : montant AVANT le numéro compteur)
    yas:  { ussdTemplate: '*145*4*1*2*{amount}*{ref}*{pin}#' },
    moov: { ussdTemplate: '*155*5*6*{ref}*{amount}*{pin}#', needsValidation: true },
  },

  LAFIA: {
    id:          'LAFIA',
    label:       'Lafia',
    description: 'Paiement Lafia via Mobile Money',
    icon:        'shield',
    color:       '#10B981',
    bg:          '#D1FAE5',
    refLabel:    'Référence Lafia',
    refPlaceholder: 'Ex: 98765432',
    refMaxLength: 15,
    yas:  { ussdTemplate: '*145*4*7*{ref}*{amount}*{pin}#', needsValidation: true },
    moov: { ussdTemplate: '*155*5*7*{ref}*{amount}*{pin}#', needsValidation: true },
  },

  BBOXX_EDL: {
    id:          'BBOXX_EDL',
    label:       'Bboxx-EDL (Solaire)',
    description: 'Recharge ton kit solaire Bboxx-EDL',
    icon:        'sun',
    color:       '#FBBF24',
    bg:          '#FEF9C3',
    refLabel:    'Numéro Bboxx-EDL',
    refPlaceholder: 'Ex: BX1234567',
    refMaxLength: 15,
    yas:  { ussdTemplate: '*145*4*8*{ref}*{amount}*{pin}#', needsValidation: true },
    moov: { ussdTemplate: '*155*5*8*{ref}*{amount}*{pin}#', needsValidation: true },
  },
};

/**
 * Groupes de factures pour regrouper les sous-options dans le hub Factures.
 * Affichés par ServiceCategoryScreen comme des entrées de groupe → ouvrent
 * BillGroupScreen qui liste les bills de chaque groupe.
 */
export const BILL_GROUPS = [
  {
    id:          'eau-electricite',
    label:       'Factures Eau et Électricité',
    description: 'CEET (électricité) et TdE (eau)',
    icon:        'zap',
    color:       '#F59E0B',
    bg:          '#FEF3C7',
    bills:       ['CEET', 'TdE'],
  },
  {
    id:          'compteurs-prepayes',
    label:       'Compteurs Prépayés',
    description: 'Cashpower, Lafia, Bboxx-EDL',
    icon:        'battery-charging',
    color:       '#10B981',
    bg:          '#D1FAE5',
    bills:       ['CASHPOWER', 'LAFIA', 'BBOXX_EDL'],
  },
];

export function getBillService(id) {
  return BILL_SERVICES[id] ?? null;
}

export function getBillGroup(id) {
  return BILL_GROUPS.find((g) => g.id === id) ?? null;
}
