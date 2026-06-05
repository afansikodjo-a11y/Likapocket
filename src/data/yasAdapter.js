/**
 * yasAdapter — transforme yas_mixx_ussd_config.json en services + forfaits
 * consommables par le hub Services.
 *
 * Source de vérité : src/data/yas_mixx_ussd_config.json (mise à jour fréquente
 * par l'utilisateur). Aucun code USSD ne doit être hardcodé dans le code JS —
 * tout vient du JSON et passe par cet adaptateur.
 *
 * Convention de placeholders :
 *   JSON  : [NUMERO] / [MONTANT] / [PIN] / [CODE_MARCHAND]
 *   JS    : {phone}  / {amount}  / {pin} / {merchant}
 *   resolveUSSD() consomme le format JS.
 */

import config from './yas_mixx_ussd_config.json';

// ── Helpers ──────────────────────────────────────────────────────────────

const PLACEHOLDER_MAP = {
  '[NUMERO]':        '{phone}',
  '[MONTANT]':       '{amount}',
  '[PIN]':           '{pin}',
  '[CODE_MARCHAND]': '{merchant}',
};

/**
 * Convertit les tags du JSON ([NUMERO], etc.) vers nos placeholders {phone}, etc.
 */
function normalizeTemplate(s) {
  if (!s) return s;
  let out = s;
  for (const [from, to] of Object.entries(PLACEHOLDER_MAP)) {
    out = out.split(from).join(to);
  }
  return out;
}

/**
 * Slug stable à partir d'un libellé, pour générer des ids déterministes.
 */
function slug(s) {
  return String(s)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Recherche par sous-chaîne dans le libellé service
function findByLabel(arr, ...needles) {
  return (arr ?? []).find((s) =>
    needles.every((n) => s.service?.toLowerCase().includes(n.toLowerCase())),
  );
}

// ── Mobile Money (Mixx) — catégorie 'momo' ──────────────────────────────

export function getYasMobileMoneyServices() {
  const mixx = config.services_financiers_mixx ?? {};
  const out = [];

  // Menu racine Mixx
  out.push({
    id:          'yas-momo-menu',
    category:    'momo',
    operator:    'yas',
    kind:        'simple-dial',
    label:       'Menu Mixx by Yas',
    description: 'Ouvre le menu Mobile Money Yas complet',
    ussd:        mixx.menu_racine ?? '*145#',
    params:      [],
  });

  // Solde — Yas demande le PIN dans son popup, on ne l'injecte pas
  const solde = findByLabel(mixx.operations_portefeuille, 'Consultation Solde');
  if (solde) {
    out.push({
      id:          'yas-momo-solde',
      category:    'momo',
      operator:    'yas',
      kind:        'simple-dial',
      label:       'Consulter mon solde Mixx',
      description: solde.description,
      ussd:        solde.code,
      params:      [],
    });
  }

  // Retrait Agent
  const retraitAgent = findByLabel(mixx.operations_portefeuille, 'Retrait', 'Agent');
  if (retraitAgent) {
    out.push({
      id:          'yas-momo-retrait-agent',
      category:    'momo',
      operator:    'yas',
      kind:        'simple-dial',
      label:       'Retrait d\'argent (Agent)',
      description: retraitAgent.description,
      ussd:        retraitAgent.code,
      params:      [],
    });
  }

  // Retrait DAB
  const retraitDab = findByLabel(mixx.operations_portefeuille, 'Retrait DAB');
  if (retraitDab) {
    out.push({
      id:          'yas-momo-retrait-dab',
      category:    'momo',
      operator:    'yas',
      kind:        'simple-dial',
      label:       'Retrait DAB',
      description: retraitDab.description,
      ussd:        retraitDab.code,
      params:      [],
    });
  }

  // Envoi National (syntaxe directe → transfer kind)
  const envoiNat = findByLabel(mixx.transferts_argent, 'Envoi National');
  if (envoiNat?.syntaxe_directe) {
    out.push({
      id:           'yas-momo-transfer',
      category:     'momo',
      operator:     'yas',
      kind:         'transfer',
      label:        'Transfert d\'argent Mixx',
      description: envoiNat.description,
      ussdTemplate: normalizeTemplate(envoiNat.syntaxe_directe),
    });
  }

  // Envoi International (menu)
  const envoiIntl = findByLabel(mixx.transferts_argent, 'Envoi International');
  if (envoiIntl) {
    out.push({
      id:          'yas-momo-transfer-intl',
      category:    'momo',
      operator:    'yas',
      kind:        'simple-dial',
      label:       'Envoi International (UEMOA)',
      description: envoiIntl.description,
      ussd:        envoiIntl.code,
      params:      [],
    });
  }

  // Envoi sans compte (menu)
  const envoiSansCompte = findByLabel(mixx.transferts_argent, 'sans compte');
  if (envoiSansCompte) {
    out.push({
      id:          'yas-momo-transfer-noaccount',
      category:    'momo',
      operator:    'yas',
      kind:        'simple-dial',
      label:       'Envoi sans compte',
      description: envoiSansCompte.description,
      ussd:        envoiSansCompte.code,
      params:      [],
    });
  }

  // Paiement Marchand (Mixx Pay) — merchant-pay kind
  const paymentMarchand = findByLabel(mixx.recharges_et_paiements, 'Paiement Marchand');
  if (paymentMarchand?.syntaxe_directe) {
    out.push({
      id:           'yas-momo-pay',
      category:     'momo',
      operator:     'yas',
      kind:         'merchant-pay',
      label:        'Paiement Marchand (Mixx Pay)',
      description: paymentMarchand.description,
      ussdTemplate: normalizeTemplate(paymentMarchand.syntaxe_directe),
    });
  }

  // Self-reversal — sécurité critique
  const reversal = (mixx.securite_annulation ?? [])[0];
  if (reversal) {
    out.push({
      id:          'yas-momo-reversal',
      category:    'momo',
      operator:    'yas',
      kind:        'simple-dial',
      label:       'Annuler un envoi (Self-Reversal)',
      description: reversal.description,
      ussd:        reversal.code,
      params:      [],
    });
  }

  // Bank-to-Wallet (menu)
  const bank = (mixx.passerelle_bancaire ?? [])[0];
  if (bank) {
    out.push({
      id:          'yas-momo-bank',
      category:    'momo',
      operator:    'yas',
      kind:        'simple-dial',
      label:       'Bank ↔ Wallet',
      description: bank.description,
      ussd:        bank.code,
      params:      [],
    });
  }

  return out;
}

// ── Crédit téléphone — catégorie 'credit' ────────────────────────────────

export function getYasCreditServices() {
  const mixx = config.services_financiers_mixx ?? {};
  const out = [];

  // Achat crédit pour soi-même via solde Mixx (avec syntaxe directe)
  const creditSelf = findByLabel(mixx.recharges_et_paiements, 'Soi-même');
  if (creditSelf?.syntaxe_directe) {
    out.push({
      id:           'yas-credit-self',
      category:     'credit',
      operator:     'yas',
      kind:         'topup-self',
      label:        'Acheter du crédit (pour moi)',
      description: creditSelf.description,
      ussdTemplate: normalizeTemplate(creditSelf.syntaxe_directe),
    });
  }

  // Achat crédit pour autrui via solde Mixx
  const creditOther = findByLabel(mixx.recharges_et_paiements, 'Autrui');
  if (creditOther?.syntaxe_directe) {
    out.push({
      id:           'yas-credit-other',
      category:     'credit',
      operator:     'yas',
      kind:         'topup-other',
      label:        'Offrir du crédit à un proche',
      description: creditOther.description,
      ussdTemplate: normalizeTemplate(creditOther.syntaxe_directe),
    });
  }

  // Sos Crédit (assistance)
  const sos = findByLabel(config.services_mobile_yas?.assistance_et_credit, 'Sos');
  if (sos) {
    out.push({
      id:          'yas-credit-sos',
      category:    'credit',
      operator:    'yas',
      kind:        'simple-dial',
      label:       sos.service,
      description: sos.description,
      ussd:        sos.code,
      params:      [],
    });
  }

  return out;
}

// ── Forfaits Internet — catégorie 'forfait' ──────────────────────────────

/**
 * Catalogue forfaits Yas pour ForfaitActionScreen.
 * Les codes Net sont des EXPRESS (sans PIN, sans params) → tap → dial direct.
 */
export function getYasForfaits() {
  const net = config.services_mobile_yas?.forfaits_internet_net?.codes_express ?? [];

  return net.map((f) => ({
    id:       `yas-${slug(f.nom)}`,
    tab:      'data',
    label:    `${f.nom} — ${f.volume}`,
    price:    parseInt(String(f.nom).replace(/\D/g, ''), 10) || 0,
    validity: f.validite,
    ussd:     f.code,            // code direct EXPRESS, pas de template
    express:  true,              // flag exploité par ForfaitActionScreen
  }));
}

/**
 * Service "entry-point" Forfaits Yas pour la grille catégorie.
 * Reste sur kind 'forfait-purchase' qui ouvre ForfaitActionScreen.
 */
export function getYasForfaitEntryService() {
  return {
    id:          'yas-forfaits',
    category:    'forfait',
    operator:    'yas',
    kind:        'forfait-purchase',
    label:       'Forfaits Net Yas',
    description: 'Forfaits Internet en 1 clic (codes express, sans PIN)',
  };
}

/**
 * Menus Ovo (mixte) et Léma (voix) — pas de catalogue détaillé dans le JSON,
 * on expose juste les menus racine en simple-dial.
 */
export function getYasForfaitMenuServices() {
  const out = [];
  const ovo  = config.services_mobile_yas?.forfaits_mixtes_ovo;
  const lema = config.services_mobile_yas?.forfaits_voix_lema;

  if (ovo?.menu_racine) {
    out.push({
      id:          'yas-forfait-ovo',
      category:    'forfait',
      operator:    'yas',
      kind:        'simple-dial',
      label:       'Forfaits Ovo (Mixte)',
      description: ovo.description,
      ussd:        ovo.menu_racine,
      params:      [],
    });
  }
  if (lema?.menu_racine) {
    out.push({
      id:          'yas-forfait-lema',
      category:    'forfait',
      operator:    'yas',
      kind:        'simple-dial',
      label:       'Forfaits Léma (Voix)',
      description: lema.description,
      ussd:        lema.menu_racine,
      params:      [],
    });
  }
  return out;
}

// ── Utilitaires (Mon Numéro, Roaming) — catégorie 'momo' (utilitaire SIM) ─

/**
 * Services utilitaires SIM (Mon Numéro, Roaming) à placer dans la catégorie momo
 * pour rester sur 4 catégories. "Mon Numéro" est techniquement universel (non lié
 * à Mobile Money) mais c'est la catégorie la plus utilisée et l'utilisateur y aura
 * accès facilement.
 */
export function getYasUtilityServices() {
  const out = [];
  const menus = config.services_mobile_yas?.menus_principaux ?? [];

  const monNumero = findByLabel(menus, 'Mon Numéro');
  if (monNumero) {
    out.push({
      id:          'yas-util-mon-numero',
      category:    'momo',         // affiché dans Mobile Money pour visibilité
      operator:    'yas',
      kind:        'simple-dial',
      label:       'Mon Numéro',
      description: monNumero.description,
      ussd:        monNumero.code,
      params:      [],
    });
  }

  const roaming = findByLabel(config.services_mobile_yas?.roaming_et_international, 'Activation Roaming');
  if (roaming) {
    out.push({
      id:          'yas-util-roaming',
      category:    'momo',
      operator:    'yas',
      kind:        'simple-dial',
      label:       'Activer le Roaming',
      description: roaming.description,
      ussd:        roaming.code,
      params:      [],
    });
  }

  return out;
}

// ── Agrégation finale ────────────────────────────────────────────────────

/**
 * Renvoie l'ensemble des services Yas générés depuis le JSON.
 * Note : les factures (CEET/TdE/Canal+/CanalBox) sont gérées côté servicesTG
 *        comme services UNIVERSELS (operator: null) avec billType — elles
 *        utilisent BILL_SERVICES + détection SIM pour choisir le bon template.
 */
export function getAllYasServices() {
  return [
    ...getYasUtilityServices(),
    ...getYasMobileMoneyServices(),
    ...getYasCreditServices(),
    getYasForfaitEntryService(),
    ...getYasForfaitMenuServices(),
  ];
}
