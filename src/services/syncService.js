import * as Network from 'expo-network';
import { getDatabase } from '../database';
import { supabase } from './supabase';

let _syncInProgress  = false;
let _listenerInterval = null;
let _retryAttempt    = 0;   // current backoff attempt (resets on success)

// Exponential backoff: 30s → 60s → 120s → 240s → 300s (cap)
const BASE_INTERVAL_MS = 30_000;
const MAX_INTERVAL_MS  = 300_000; // 5 min cap
const MAX_RETRIES      = 5;

function _nextDelay() {
  // 30s * 2^attempt, capped at 5 min
  return Math.min(BASE_INTERVAL_MS * Math.pow(2, _retryAttempt), MAX_INTERVAL_MS);
}

function _isTransient(err) {
  const msg = String(err?.message ?? err ?? '').toLowerCase();
  return msg.includes('network') || msg.includes('fetch') || msg.includes('timeout')
      || msg.includes('502') || msg.includes('503') || msg.includes('504');
}

// ── Core sync ──────────────────────────────────────────────────────────────

/**
 * Pushes all PENDING_SYNC transactions to Supabase, then marks them VALIDATED.
 * No-op if offline or already running.
 */
export async function syncPendingTransactions() {
  if (_syncInProgress) return { synced: 0, error: null };
  _syncInProgress = true;

  try {
    // 1. Network check
    const net = await Network.getNetworkStateAsync();
    if (!net.isConnected || !net.isInternetReachable) {
      console.warn('[sync] offline — skip');
      return { synced: 0, error: 'offline' };
    }

    // 2. Auth check — only sync if a session exists
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.warn('[sync] no_session — utilisateur non authentifié');
      return { synced: 0, error: 'no_session' };
    }

    // 3. Fetch pending transactions
    const db      = await getDatabase();
    const pending = await db.getAllAsync(
      "SELECT * FROM transactions WHERE status = 'PENDING_SYNC' ORDER BY created_at ASC LIMIT 50",
    );
    if (pending.length === 0) {
      console.log('[sync] aucune transaction pending — reconcile balance seulement');
      // ⚠️ Toujours réconcilier la balance même sans push :
      // le serveur peut avoir été mis à jour par l'admin (recharge validée).
      await _reconcileBalance(db, session.user.id);
      return { synced: 0, error: null };
    }

    console.log(`[sync] tentative d'upsert de ${pending.length} transaction(s) pour user ${session.user.id}`);

    // 4. Upsert to Supabase
    const rows = pending.map((tx) => ({
      tx_id:           tx.tx_id,
      user_id:         session.user.id,
      type:            tx.type,
      amount:          tx.amount,
      counterparty_id: tx.counterparty_id ?? null,
      status:          'VALIDATED',
      description:     tx.description ?? '',
      created_at:      tx.created_at,
    }));

    const { data: upserted, error: supaError } = await supabase
      .from('transactions')
      .upsert(rows, { onConflict: 'tx_id' })
      .select();

    if (supaError) {
      console.error('[sync] ❌ Supabase rejette l\'upsert :', supaError);
      throw new Error(supaError.message);
    }

    console.log(`[sync] ✅ ${upserted?.length ?? 0} ligne(s) upsertées dans Supabase`);

    // 5. Mark as VALIDATED locally
    const ids = pending.map((tx) => `'${tx.tx_id}'`).join(', ');
    await db.execAsync(
      `UPDATE transactions SET status = 'VALIDATED' WHERE tx_id IN (${ids})`,
    );

    // 6. Reconcile wallet balance with server
    await _reconcileBalance(db, session.user.id);

    _retryAttempt = 0; // success → reset backoff
    return { synced: pending.length, error: null };
  } catch (e) {
    if (_isTransient(e) && _retryAttempt < MAX_RETRIES) {
      _retryAttempt += 1;
    } else {
      _retryAttempt = 0;
    }
    return { synced: 0, error: e.message, transient: _isTransient(e) };
  } finally {
    _syncInProgress = false;
  }
}

// ── Pull from server : restore transactions on a fresh install ────────────

/**
 * Télécharge depuis Supabase les transactions du user qui n'existent pas
 * encore localement. Utile après réinstallation / changement de device.
 */
export async function pullFromServer() {
  try {
    const net = await Network.getNetworkStateAsync();
    if (!net.isConnected || !net.isInternetReachable) return { pulled: 0, error: 'offline' };

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { pulled: 0, error: 'no_session' };

    const db = await getDatabase();

    // Récupère les transactions du serveur (limité à 500 récentes)
    const { data: serverTxs, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) throw new Error(error.message);
    if (!serverTxs?.length) return { pulled: 0, error: null };

    // Pour chaque tx serveur, on l'insère localement si elle n'existe pas
    let pulled = 0;
    await db.withTransactionAsync(async () => {
      for (const tx of serverTxs) {
        const existing = await db.getFirstAsync(
          'SELECT tx_id FROM transactions WHERE tx_id = ?',
          [tx.tx_id],
        );
        if (existing) continue;
        await db.runAsync(
          `INSERT INTO transactions
             (tx_id, type, amount, counterparty_id, status, description, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            tx.tx_id, tx.type, tx.amount,
            tx.counterparty_id ?? null,
            'VALIDATED',                       // tout ce qui vient du serveur est validé
            tx.description ?? '',
            tx.created_at,
          ],
        );
        pulled += 1;
      }
    });

    // Réconcilie la balance locale avec celle du serveur
    await _reconcileBalance(db, session.user.id);

    console.log(`[sync] ⬇ Pulled ${pulled} transaction(s) depuis Supabase`);
    return { pulled, error: null };
  } catch (e) {
    console.error('[sync] pull failed:', e?.message ?? e);
    return { pulled: 0, error: e.message };
  }
}

// ── Balance reconciliation ─────────────────────────────────────────────────

async function _reconcileBalance(db, userId) {
  const { data, error } = await supabase
    .from('wallets')
    .select('current_balance')
    .eq('user_id', userId)
    .single();

  if (error || !data) return; // No server wallet yet — skip

  const local = await db.getFirstAsync('SELECT current_balance FROM wallet WHERE id = 1');
  if (!local) return;

  const serverBalance = data.current_balance ?? 0;
  const localBalance  = local.current_balance ?? 0;

  // Garde-fou : si le serveur dit 0 alors qu'on a des fonds locaux,
  // c'est probablement que le trigger côté Supabase n'a pas (encore)
  // mis à jour la balance. On NE remplace PAS le solde local pour
  // éviter de faire disparaître l'argent de l'utilisateur.
  if (serverBalance === 0 && localBalance > 0) return;

  // Sinon le serveur est la source de vérité après sync.
  if (localBalance !== serverBalance) {
    await db.runAsync(
      "UPDATE wallet SET current_balance = ?, updated_at = datetime('now') WHERE id = 1",
      [serverBalance],
    );
  }
}

// ── Network listener ───────────────────────────────────────────────────────

/**
 * Adaptive polling loop with exponential backoff on transient failures.
 * Base interval is 30s ; on each transient error it doubles up to 5 min.
 * Returns a cleanup function — call it on app unmount or logout.
 */
export function startNetworkListener(onSyncResult) {
  if (_listenerInterval) return () => { clearTimeout(_listenerInterval); _listenerInterval = null; };

  let stopped = false;

  const tick = async () => {
    if (stopped) return;
    const result = await syncPendingTransactions();
    if (typeof onSyncResult === 'function' && (result.synced > 0 || result.error)) {
      onSyncResult(result);
    }
    if (stopped) return;
    _listenerInterval = setTimeout(tick, _nextDelay());
  };

  // Immediate first attempt, then schedule subsequent
  tick();

  return () => {
    stopped = true;
    if (_listenerInterval) clearTimeout(_listenerInterval);
    _listenerInterval = null;
    _retryAttempt = 0;
  };
}
