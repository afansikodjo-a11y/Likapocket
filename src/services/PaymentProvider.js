/**
 * PaymentProvider — Interface unifiée pour les opérations financières online.
 *
 * Architecture :
 *   • initiateTopUp()  → Pay-In  (recharge depuis Mobile Money / carte)
 *   • initiateWithdraw() → Pay-Out (retrait vers Mobile Money / banque)
 *
 * Les transactions en attente de confirmation réseau sont stockées en SQLite
 * avec status='PENDING_SYNC' et synchronisées par syncService.
 */

import { supabase, getCurrentUser } from './supabase';
// On passe par l'index pour bénéficier du routage web (../database/index.web.js)
import { credit, debit } from '../database';

// ── Fournisseurs supportés ─────────────────────────────────────────────────
export const PROVIDERS = {
  INTERNAL:      'internal',      // recharge interne validée par l'admin
  ORANGE_MONEY:  'orange_money',
  MOOV_MONEY:    'moov_money',
  WAVE:          'wave',
  CARD:          'card',
};

// ── Top-up (Pay-In) ────────────────────────────────────────────────────────

/**
 * Initie une recharge depuis un fournisseur externe.
 *
 * Crée une demande PENDING dans Supabase. Le solde local NE BOUGE PAS
 * tant que la demande n'a pas été validée (par l'admin pendant la phase de
 * test, par Moneroo plus tard). L'utilisateur récupère son crédit via
 * la sync après validation.
 *
 * @param {{ amount: number, provider: string, phoneNumber?: string }} opts
 */
export async function initiateTopUp({ amount, provider, phoneNumber }) {
  _validateAmount(amount);
  _validateProvider(provider);

  const user = await getCurrentUser();
  if (!user) throw new Error('Authentification requise pour une recharge.');

  const { data, error } = await supabase
    .from('payment_requests')
    .insert({
      user_id:      user.id,
      type:         'TOPUP',
      amount,
      provider,
      phone_number: phoneNumber ?? null,
      status:       'PENDING',
    })
    .select()
    .single();

  if (error) throw new Error(`Erreur de recharge : ${error.message}`);

  return { requestId: data.id, amount, provider };
}

// ── Withdraw (Pay-Out) ─────────────────────────────────────────────────────

/**
 * Initie un retrait — crée une demande PENDING dans Supabase.
 *
 * Le solde local NE BOUGE PAS tant que l'admin n'a pas validé. Lors de la
 * validation, l'admin insère une transaction WITHDRAW côté serveur, le trigger
 * SQL met à jour le wallet, et l'app pull la nouvelle transaction → solde
 * débité localement.
 *
 * @param {{ amount: number, provider: string, phoneNumber: string }} opts
 */
export async function initiateWithdraw({ amount, provider, phoneNumber }) {
  _validateAmount(amount);
  _validateProvider(provider);
  if (!phoneNumber) throw new Error('Numéro de téléphone requis pour un retrait.');

  const user = await getCurrentUser();
  if (!user) throw new Error('Authentification requise pour un retrait.');

  // Vérification du solde local (informatif, l'admin re-vérifiera côté serveur)
  const { getBalance } = await import('../database');
  const balance = await getBalance();
  if (balance < amount) {
    throw new Error(`Solde insuffisant (${balance.toLocaleString('fr-FR')} F).`);
  }

  // Création de la demande PENDING uniquement
  const { data, error } = await supabase
    .from('payment_requests')
    .insert({
      user_id:      user.id,
      type:         'WITHDRAW',
      amount,
      provider,
      phone_number: phoneNumber,
      status:       'PENDING',
    })
    .select()
    .single();

  if (error) throw new Error(`Erreur de retrait : ${error.message}`);

  return { requestId: data.id, amount, provider };
}

// ── Helpers ────────────────────────────────────────────────────────────────

function _validateAmount(amount) {
  if (typeof amount !== 'number' || !Number.isInteger(amount) || amount <= 0) {
    throw new Error('Le montant doit être un entier positif (CFA).');
  }
}

function _validateProvider(provider) {
  if (!Object.values(PROVIDERS).includes(provider)) {
    throw new Error(`Fournisseur inconnu : ${provider}`);
  }
}

function _providerLabel(provider) {
  const labels = {
    internal:     'Recharge interne',
    orange_money: 'Orange Money',
    moov_money:   'Moov Money',
    wave:         'Wave',
    card:         'Carte bancaire',
  };
  return labels[provider] ?? provider;
}
