import * as SQLite from 'expo-sqlite';
import * as Crypto from 'expo-crypto';

const DB_NAME = 'lika.db';

let _db        = null;
let _dbPromise = null;   // empêche les ouvertures concurrentes

export async function getDatabase() {
  if (_db) return _db;
  if (_dbPromise) return _dbPromise;

  _dbPromise = (async () => {
    try {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      await _boot(db);
      _db = db;
      return db;
    } catch (e) {
      // En cas d'échec, on reset pour permettre une nouvelle tentative
      console.error('[db] open/boot failed:', e?.message ?? e);
      _dbPromise = null;
      _db = null;
      throw e;
    }
  })();

  return _dbPromise;
}

// ── UUID v4 helper (SQLite has no gen_random_uuid) ────────────────────────
export async function generateUUID() {
  const bytes = await Crypto.getRandomBytesAsync(16);
  const hex   = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
  return [
    hex.slice(0,  8),
    hex.slice(8,  12),
    '4' + hex.slice(13, 16),
    ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16) + hex.slice(17, 20),
    hex.slice(20, 32),
  ].join('-');
}

// ── Boot: pragmas → schema → migrations ──────────────────────────────────
async function _boot(db) {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
  `);

  // Read schema version (defensive — getFirstAsync may return null on fresh DB)
  let version = 0;
  try {
    const row = await db.getFirstAsync('PRAGMA user_version');
    version = row?.user_version ?? 0;
  } catch (e) {
    console.warn('[db] could not read user_version, assuming 0:', e?.message);
  }

  if (version === 0) {
    await _createFresh(db);
  } else {
    if (version < 3) await _migrateTo3(db);
    if (version < 4) await _migrateTo4(db);
  }
}

// ── Fresh install (v3 schema) ─────────────────────────────────────────────
async function _createFresh(db) {
  await db.execAsync(`
    -- Wallet (singleton, one row per device/user)
    CREATE TABLE IF NOT EXISTS wallet (
      id              INTEGER PRIMARY KEY CHECK(id = 1),
      current_balance INTEGER NOT NULL DEFAULT 0 CHECK(current_balance >= 0),
      user_id         TEXT,
      updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    -- Transaction ledger
    CREATE TABLE IF NOT EXISTS transactions (
      tx_id           TEXT    PRIMARY KEY,
      type            TEXT    NOT NULL
                              CHECK(type IN ('COLLECT','TRANSFER','TOPUP','WITHDRAW')),
      amount          INTEGER NOT NULL CHECK(amount > 0),
      counterparty_id TEXT,
      status          TEXT    NOT NULL DEFAULT 'PENDING_SYNC'
                              CHECK(status IN ('PENDING_SYNC','VALIDATED')),
      description     TEXT    NOT NULL DEFAULT '',
      nonce           TEXT,
      category        TEXT,
      created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    -- Anti-replay nonce store
    CREATE TABLE IF NOT EXISTS seen_nonces (
      nonce      TEXT PRIMARY KEY,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- ── Finances perso (v4) ──────────────────────────────────────────────
    -- Dépenses/revenus en espèces saisis à la main (n'affectent PAS le solde Lika)
    CREATE TABLE IF NOT EXISTS manual_entries (
      id          TEXT    PRIMARY KEY,
      kind        TEXT    NOT NULL CHECK(kind IN ('INCOME','EXPENSE')),
      amount      INTEGER NOT NULL CHECK(amount > 0),
      category    TEXT,
      label       TEXT    NOT NULL DEFAULT '',
      occurred_at TEXT    NOT NULL DEFAULT (datetime('now')),
      created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    -- Plafond de budget mensuel par catégorie
    CREATE TABLE IF NOT EXISTS budgets (
      id            TEXT    PRIMARY KEY,
      category      TEXT    NOT NULL UNIQUE,
      monthly_limit INTEGER NOT NULL CHECK(monthly_limit > 0),
      created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    -- Coffres d'épargne bloqués
    CREATE TABLE IF NOT EXISTS savings_goals (
      id                   TEXT    PRIMARY KEY,
      name                 TEXT    NOT NULL,
      target_amount        INTEGER NOT NULL CHECK(target_amount > 0),
      current_amount       INTEGER NOT NULL DEFAULT 0,
      contribution_amount  INTEGER NOT NULL CHECK(contribution_amount > 0),
      frequency            TEXT    NOT NULL CHECK(frequency IN ('DAILY','WEEKLY','MONTHLY')),
      unlock_date          TEXT    NOT NULL,
      status               TEXT    NOT NULL DEFAULT 'ACTIVE'
                                   CHECK(status IN ('ACTIVE','COMPLETED','UNLOCKED','BROKEN')),
      last_contribution_at TEXT,
      created_at           TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at           TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    -- Journal des dépôts dans les coffres
    CREATE TABLE IF NOT EXISTS savings_contributions (
      id         TEXT    PRIMARY KEY,
      goal_id    TEXT    NOT NULL REFERENCES savings_goals(id) ON DELETE CASCADE,
      amount     INTEGER NOT NULL CHECK(amount > 0),
      created_at TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    -- Seed wallet
    INSERT OR IGNORE INTO wallet (id, current_balance, updated_at)
    VALUES (1, 0, datetime('now'));

    PRAGMA user_version = 4;
  `);
}

// ── Migration from v1/v2 → v3 ─────────────────────────────────────────────
async function _migrateTo3(db) {
  await db.withTransactionAsync(async () => {

    // 1. Wallet: add new columns if absent
    const addCol = async (sql) => { try { await db.execAsync(sql); } catch {} };
    await addCol('ALTER TABLE wallet ADD COLUMN current_balance INTEGER NOT NULL DEFAULT 0');
    await addCol('ALTER TABLE wallet ADD COLUMN user_id TEXT');

    // Copy balance → current_balance (coerce to integer)
    await db.execAsync(
      'UPDATE wallet SET current_balance = CAST(COALESCE(balance, 0) AS INTEGER) WHERE current_balance = 0',
    );

    // 2. Transactions: recreate with v3 schema
    //    Map: credit→COLLECT, debit→TRANSFER
    //    Map: confirmed/synced→VALIDATED, pending_sync→PENDING_SYNC, rejected→VALIDATED
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS transactions_v3 (
        tx_id           TEXT    PRIMARY KEY,
        type            TEXT    NOT NULL CHECK(type IN ('COLLECT','TRANSFER','TOPUP','WITHDRAW')),
        amount          INTEGER NOT NULL CHECK(amount > 0),
        counterparty_id TEXT,
        status          TEXT    NOT NULL DEFAULT 'PENDING_SYNC'
                                CHECK(status IN ('PENDING_SYNC','VALIDATED')),
        description     TEXT    NOT NULL DEFAULT '',
        nonce           TEXT,
        created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
      );
    `);

    // Check if old transactions table exists
    const tbl = await db.getFirstAsync(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='transactions'",
    );

    if (tbl) {
      // Migrate rows (use rowid as uuid-like fallback)
      const rows = await db.getAllAsync('SELECT * FROM transactions');
      for (const r of rows) {
        const txId  = r.tx_id  || r.nonce || `legacy-${r.id}`;
        const type  = r.type === 'credit' ? 'COLLECT' : 'TRANSFER';
        const status = (r.status === 'confirmed' || r.status === 'synced') ? 'VALIDATED' : 'PENDING_SYNC';
        await db.runAsync(
          `INSERT OR IGNORE INTO transactions_v3
             (tx_id, type, amount, counterparty_id, status, description, nonce, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [txId, type, Math.round(r.amount ?? 0), r.merchant_id ?? r.counterparty_id ?? null,
           status, r.description ?? '', r.nonce ?? null, r.created_at],
        );
      }
      await db.execAsync('DROP TABLE transactions');
    }

    await db.execAsync('ALTER TABLE transactions_v3 RENAME TO transactions');

    // 3. Seen_nonces: already correct schema if exists
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS seen_nonces (
        nonce      TEXT PRIMARY KEY,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);

    await db.execAsync('PRAGMA user_version = 3');
  });
}

// ── Migration v3 → v4 : module Finances perso ─────────────────────────────
async function _migrateTo4(db) {
  await db.withTransactionAsync(async () => {
    // 1. Colonne category sur transactions (ignore si déjà présente)
    try { await db.execAsync('ALTER TABLE transactions ADD COLUMN category TEXT'); } catch {}

    // 2. Nouvelles tables Finances perso
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS manual_entries (
        id          TEXT    PRIMARY KEY,
        kind        TEXT    NOT NULL CHECK(kind IN ('INCOME','EXPENSE')),
        amount      INTEGER NOT NULL CHECK(amount > 0),
        category    TEXT,
        label       TEXT    NOT NULL DEFAULT '',
        occurred_at TEXT    NOT NULL DEFAULT (datetime('now')),
        created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS budgets (
        id            TEXT    PRIMARY KEY,
        category      TEXT    NOT NULL UNIQUE,
        monthly_limit INTEGER NOT NULL CHECK(monthly_limit > 0),
        created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS savings_goals (
        id                   TEXT    PRIMARY KEY,
        name                 TEXT    NOT NULL,
        target_amount        INTEGER NOT NULL CHECK(target_amount > 0),
        current_amount       INTEGER NOT NULL DEFAULT 0,
        contribution_amount  INTEGER NOT NULL CHECK(contribution_amount > 0),
        frequency            TEXT    NOT NULL CHECK(frequency IN ('DAILY','WEEKLY','MONTHLY')),
        unlock_date          TEXT    NOT NULL,
        status               TEXT    NOT NULL DEFAULT 'ACTIVE'
                                     CHECK(status IN ('ACTIVE','COMPLETED','UNLOCKED','BROKEN')),
        last_contribution_at TEXT,
        created_at           TEXT    NOT NULL DEFAULT (datetime('now')),
        updated_at           TEXT    NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS savings_contributions (
        id         TEXT    PRIMARY KEY,
        goal_id    TEXT    NOT NULL REFERENCES savings_goals(id) ON DELETE CASCADE,
        amount     INTEGER NOT NULL CHECK(amount > 0),
        created_at TEXT    NOT NULL DEFAULT (datetime('now'))
      );
    `);

    await db.execAsync('PRAGMA user_version = 4');
  });
}
