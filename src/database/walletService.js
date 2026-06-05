import * as SecureStore from 'expo-secure-store';
import { getDatabase, generateUUID } from './db';
import { TX_TYPE, TX_STATUS } from '../theme';

// ── Guards ─────────────────────────────────────────────────────────────────

function assertPositiveInt(amount) {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error(`Le montant doit être un entier positif en CFA (reçu : ${amount}).`);
  }
}

function assertDescription(description) {
  if (typeof description !== 'string' || description.trim().length === 0) {
    throw new Error('La description ne peut pas être vide.');
  }
}

// ── Balance ────────────────────────────────────────────────────────────────

export async function getBalance() {
  const db  = await getDatabase();
  const row = await db.getFirstAsync('SELECT current_balance FROM wallet WHERE id = 1');
  return row?.current_balance ?? 0;
}

export async function setUserId(userId) {
  const db = await getDatabase();
  await db.runAsync(
    "UPDATE wallet SET user_id = ?, updated_at = datetime('now') WHERE id = 1",
    [userId],
  );
}

// ── Manual credit / debit (TOPUP / WITHDRAW) ───────────────────────────────

export async function credit(amount, description) {
  assertPositiveInt(Math.round(amount)); // tolerate float input, round to int
  assertDescription(description);

  const db    = await getDatabase();
  const txId  = await generateUUID();
  let newBalance;

  await db.withTransactionAsync(async () => {
    const row  = await db.getFirstAsync('SELECT current_balance FROM wallet WHERE id = 1');
    newBalance = (row?.current_balance ?? 0) + Math.round(amount);

    await db.runAsync(
      "UPDATE wallet SET current_balance = ?, updated_at = datetime('now') WHERE id = 1",
      [newBalance],
    );
    await db.runAsync(
      `INSERT INTO transactions (tx_id, type, amount, description, status)
       VALUES (?, ?, ?, ?, ?)`,
      [txId, TX_TYPE.TOPUP, Math.round(amount), description.trim(), TX_STATUS.VALIDATED],
    );
  });

  return newBalance;
}

export async function debit(amount, description) {
  assertPositiveInt(Math.round(amount));
  assertDescription(description);

  const db    = await getDatabase();
  const txId  = await generateUUID();
  let newBalance;

  await db.withTransactionAsync(async () => {
    const row     = await db.getFirstAsync('SELECT current_balance FROM wallet WHERE id = 1');
    const current = row?.current_balance ?? 0;

    if (current < Math.round(amount)) {
      throw new Error(`Solde insuffisant (${current} CFA). Demandé : ${amount} CFA.`);
    }

    newBalance = current - Math.round(amount);

    await db.runAsync(
      "UPDATE wallet SET current_balance = ?, updated_at = datetime('now') WHERE id = 1",
      [newBalance],
    );
    await db.runAsync(
      `INSERT INTO transactions (tx_id, type, amount, description, status)
       VALUES (?, ?, ?, ?, ?)`,
      [txId, TX_TYPE.WITHDRAW, Math.round(amount), description.trim(), TX_STATUS.VALIDATED],
    );
  });

  return newBalance;
}

// ── QR credit — COLLECT (received from merchant scan) ─────────────────────

/**
 * Atomically credits the wallet from a verified QR payload.
 * Records the transaction as PENDING_SYNC (to be synced when online).
 */
export async function creditFromQR({ amount, merchantId, merchantName, nonce, currency = 'CFA' }) {
  const intAmount = Math.round(amount);
  assertPositiveInt(intAmount);
  if (!nonce) throw new Error('Nonce manquant.');

  const db = await getDatabase();

  // Purge expired nonces (>10 min) then check replay
  await db.runAsync(
    "DELETE FROM seen_nonces WHERE created_at < datetime('now', '-10 minutes')",
  );
  const existing = await db.getFirstAsync(
    'SELECT 1 FROM seen_nonces WHERE nonce = ?', [nonce],
  );
  if (existing) throw new Error('Ce QR a déjà été utilisé. Demandez un nouveau code.');

  const txId = await generateUUID();
  let newBalance;

  await db.withTransactionAsync(async () => {
    // Lock nonce
    await db.runAsync('INSERT INTO seen_nonces (nonce) VALUES (?)', [nonce]);

    const row  = await db.getFirstAsync('SELECT current_balance FROM wallet WHERE id = 1');
    newBalance = (row?.current_balance ?? 0) + intAmount;

    await db.runAsync(
      "UPDATE wallet SET current_balance = ?, updated_at = datetime('now') WHERE id = 1",
      [newBalance],
    );
    await db.runAsync(
      `INSERT INTO transactions
         (tx_id, type, amount, counterparty_id, status, description, nonce)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        txId,
        TX_TYPE.COLLECT,
        intAmount,
        merchantId,
        TX_STATUS.PENDING_SYNC,
        `Reliquat de ${merchantName || merchantId}`,
        nonce,
      ],
    );
  });

  return newBalance;
}

// ── QR debit — TRANSFER (send to recipient) ────────────────────────────────

/**
 * Debits the wallet for a peer-to-peer transfer.
 * Validates sufficient balance BEFORE generating; throws if insufficient.
 */
export async function debitForTransfer({ amount, recipientId, recipientName, nonce }) {
  const intAmount = Math.round(amount);
  assertPositiveInt(intAmount);

  const db = await getDatabase();

  // ✅ Règle métier : vérification du solde avant toute génération de QR
  const row     = await db.getFirstAsync('SELECT current_balance FROM wallet WHERE id = 1');
  const current = row?.current_balance ?? 0;
  if (current < intAmount) {
    throw new Error(`Solde insuffisant (${current} CFA). Impossible de transférer ${intAmount} CFA.`);
  }

  const txId = await generateUUID();
  let newBalance;

  await db.withTransactionAsync(async () => {
    // Re-read inside transaction to avoid race conditions
    const locked = await db.getFirstAsync('SELECT current_balance FROM wallet WHERE id = 1');
    if ((locked?.current_balance ?? 0) < intAmount) {
      throw new Error('Solde insuffisant (concurrence détectée).');
    }

    newBalance = locked.current_balance - intAmount;

    await db.runAsync(
      "UPDATE wallet SET current_balance = ?, updated_at = datetime('now') WHERE id = 1",
      [newBalance],
    );
    await db.runAsync(
      `INSERT INTO transactions
         (tx_id, type, amount, counterparty_id, status, description, nonce)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        txId,
        TX_TYPE.TRANSFER,
        intAmount,
        recipientId ?? null,
        TX_STATUS.PENDING_SYNC,
        `Transfert à ${recipientName || recipientId || 'inconnu'}`,
        nonce ?? null,
      ],
    );
  });

  return newBalance;
}

// ── Rollback an unscanned transfer ─────────────────────────────────────────

/**
 * Annule un TRANSFER PENDING_SYNC en re-créditant le wallet.
 * Utilisé quand un QR expire (TTL 5 min) sans avoir été scanné.
 *
 * @param {string} nonce
 * @returns {Promise<number|null>} Le nouveau solde, ou null si rien à annuler.
 */
export async function cancelTransfer(nonce) {
  if (!nonce) return null;

  const db = await getDatabase();

  // Find the matching TRANSFER transaction
  const tx = await db.getFirstAsync(
    `SELECT * FROM transactions
     WHERE nonce = ? AND type = ? AND status = ?
     LIMIT 1`,
    [nonce, TX_TYPE.TRANSFER, TX_STATUS.PENDING_SYNC],
  );
  if (!tx) return null;

  let newBalance;
  await db.withTransactionAsync(async () => {
    const row  = await db.getFirstAsync('SELECT current_balance FROM wallet WHERE id = 1');
    newBalance = (row?.current_balance ?? 0) + tx.amount;

    await db.runAsync(
      "UPDATE wallet SET current_balance = ?, updated_at = datetime('now') WHERE id = 1",
      [newBalance],
    );
    await db.runAsync('DELETE FROM transactions WHERE tx_id = ?', [tx.tx_id]);
  });

  return newBalance;
}

// ── Queries ────────────────────────────────────────────────────────────────

export async function getTransactions(limit = 50) {
  if (!Number.isInteger(limit) || limit < 1) throw new Error('limit invalide.');
  const db = await getDatabase();
  return db.getAllAsync(
    'SELECT * FROM transactions ORDER BY created_at DESC LIMIT ?', [limit],
  );
}

export async function getTransactionsByType(type, limit = 50) {
  if (!Object.values(TX_TYPE).includes(type)) throw new Error('Type de transaction invalide.');
  const db = await getDatabase();
  return db.getAllAsync(
    'SELECT * FROM transactions WHERE type = ? ORDER BY created_at DESC LIMIT ?',
    [type, limit],
  );
}

export async function getPendingSyncCount() {
  const db  = await getDatabase();
  const row = await db.getFirstAsync(
    "SELECT COUNT(*) as cnt FROM transactions WHERE status = 'PENDING_SYNC'",
  );
  return row?.cnt ?? 0;
}

// ── Secure enclave helpers ─────────────────────────────────────────────────

export async function saveSecureValue(key, value) {
  await SecureStore.setItemAsync(`lika.${key}`, String(value));
}

export async function getSecureValue(key) {
  return SecureStore.getItemAsync(`lika.${key}`);
}

export async function deleteSecureValue(key) {
  await SecureStore.deleteItemAsync(`lika.${key}`);
}
