// ══════════════════════════════════════════════════════════════════════════
//  Web persistance — vraie implémentation localStorage
//  Permet d'utiliser le navigateur comme un VRAI second device pour les
//  tests (Alice sur web + Bob sur Android par exemple).
// ══════════════════════════════════════════════════════════════════════════

import { TX_TYPE, TX_STATUS } from '../theme';
import { guessCategory, SAVINGS_CATEGORY_ID } from '../data/financeCategories';

const _ls = (typeof window !== 'undefined' && window.localStorage) ? window.localStorage : null;

const K = {
  wallet: 'lika.web.wallet',
  txs:    'lika.web.transactions',
  nonces: 'lika.web.nonces',
  secure: 'lika.web.secure.',
  userId: 'lika.web.userId',
  budgets:       'lika.web.budgets',
  manualEntries: 'lika.web.manualEntries',
  savingsGoals:  'lika.web.savingsGoals',
  savingsContribs: 'lika.web.savingsContributions',
};

// ── Helpers ────────────────────────────────────────────────────────────────

function _load(key, fallback) {
  if (!_ls) return fallback;
  try { return JSON.parse(_ls.getItem(key) ?? 'null') ?? fallback; }
  catch { return fallback; }
}
function _save(key, value) { if (_ls) _ls.setItem(key, JSON.stringify(value)); }

const loadWallet = () => _load(K.wallet, { id: 1, current_balance: 0, user_id: null });
const saveWallet = (w) => _save(K.wallet, w);
const loadTxs    = () => _load(K.txs, []);
const saveTxs    = (t) => _save(K.txs, t);

function loadNonces() {
  const arr = _load(K.nonces, []);
  const cutoff = Date.now() - 10 * 60 * 1000;
  return arr.filter((n) => new Date(n.created_at).getTime() >= cutoff);
}
function saveNonces(arr) { _save(K.nonces, arr); }

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

// ── Schema guards ──────────────────────────────────────────────────────────

function assertPositiveInt(amount) {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error(`Le montant doit être un entier positif (reçu : ${amount}).`);
  }
}

// ══════════════════════════════════════════════════════════════════════════
//  Compat layer pour syncService.js (qui appelle getDatabase().xxx)
// ══════════════════════════════════════════════════════════════════════════

let _dbStub = null;
export async function getDatabase() {
  if (_dbStub) return _dbStub;
  _dbStub = {
    getAllAsync: async (sql) => {
      if (/FROM transactions.+PENDING_SYNC/.test(sql)) {
        return loadTxs()
          .filter((t) => t.status === TX_STATUS.PENDING_SYNC)
          .sort((a, b) => a.created_at.localeCompare(b.created_at))
          .slice(0, 50);
      }
      if (/FROM transactions/.test(sql)) return loadTxs();
      return [];
    },
    getFirstAsync: async (sql, params = []) => {
      if (/FROM wallet/.test(sql)) return loadWallet();
      if (/FROM transactions WHERE tx_id/.test(sql)) {
        return loadTxs().find((t) => t.tx_id === params[0]) ?? null;
      }
      return null;
    },
    runAsync: async (sql, params = []) => {
      if (/UPDATE wallet SET current_balance/.test(sql)) {
        const w = loadWallet();
        w.current_balance = params[0];
        w.updated_at = new Date().toISOString();
        saveWallet(w);
      } else if (/INSERT INTO transactions/.test(sql)) {
        // Forme : tx_id, type, amount, counterparty_id, status, description, [nonce], created_at
        const txs = loadTxs();
        txs.push({
          tx_id:           params[0],
          type:            params[1],
          amount:          params[2],
          counterparty_id: params[3] ?? null,
          status:          params[4] ?? TX_STATUS.PENDING_SYNC,
          description:     params[5] ?? '',
          nonce:           params[6] ?? null,
          created_at:      params[7] ?? new Date().toISOString(),
        });
        saveTxs(txs);
      }
    },
    execAsync: async (sql) => {
      // Marque comme VALIDATED un set d'IDs (utilisé par syncService)
      const m = sql.match(/UPDATE transactions SET status = 'VALIDATED' WHERE tx_id IN \(([^)]+)\)/);
      if (m) {
        const ids = m[1].split(',').map((s) => s.trim().replace(/^'|'$/g, ''));
        const txs = loadTxs();
        for (const tx of txs) if (ids.includes(tx.tx_id)) tx.status = TX_STATUS.VALIDATED;
        saveTxs(txs);
      }
    },
    withTransactionAsync: async (fn) => { await fn(); },
  };
  return _dbStub;
}

export async function generateUUID() { return uuid(); }

// ══════════════════════════════════════════════════════════════════════════
//  Wallet operations (même API que la version native)
// ══════════════════════════════════════════════════════════════════════════

export async function setUserId(userId) {
  const w = loadWallet();
  w.user_id = userId;
  saveWallet(w);
  if (_ls) _ls.setItem(K.userId, userId);
}

export async function getBalance() {
  return loadWallet().current_balance ?? 0;
}

export async function credit(amount, description) {
  const amt = Math.round(amount);
  assertPositiveInt(amt);

  const w = loadWallet();
  w.current_balance = (w.current_balance ?? 0) + amt;
  saveWallet(w);

  const txs = loadTxs();
  txs.push({
    tx_id:           uuid(),
    type:            TX_TYPE.TOPUP,
    amount:          amt,
    counterparty_id: null,
    status:          TX_STATUS.VALIDATED,
    description:     description?.trim() ?? '',
    nonce:           null,
    created_at:      new Date().toISOString(),
  });
  saveTxs(txs);
  return w.current_balance;
}

export async function debit(amount, description) {
  const amt = Math.round(amount);
  assertPositiveInt(amt);
  const w = loadWallet();
  if ((w.current_balance ?? 0) < amt) throw new Error(`Solde insuffisant.`);
  w.current_balance -= amt;
  saveWallet(w);

  const txs = loadTxs();
  txs.push({
    tx_id:           uuid(),
    type:            TX_TYPE.WITHDRAW,
    amount:          amt,
    counterparty_id: null,
    status:          TX_STATUS.VALIDATED,
    description:     description?.trim() ?? '',
    nonce:           null,
    created_at:      new Date().toISOString(),
  });
  saveTxs(txs);
  return w.current_balance;
}

export async function creditFromQR({ amount, merchantId, merchantName, nonce }) {
  const amt = Math.round(amount);
  assertPositiveInt(amt);
  if (!nonce) throw new Error('Nonce manquant.');

  // Anti-replay
  const seen = loadNonces();
  if (seen.find((n) => n.nonce === nonce)) {
    throw new Error('Ce QR a déjà été utilisé. Demandez un nouveau code.');
  }
  seen.push({ nonce, created_at: new Date().toISOString() });
  saveNonces(seen);

  const w = loadWallet();
  w.current_balance = (w.current_balance ?? 0) + amt;
  saveWallet(w);

  const txs = loadTxs();
  txs.push({
    tx_id:           uuid(),
    type:            TX_TYPE.COLLECT,
    amount:          amt,
    counterparty_id: merchantId,
    status:          TX_STATUS.PENDING_SYNC,
    description:     `Reliquat de ${merchantName || merchantId}`,
    nonce,
    created_at:      new Date().toISOString(),
  });
  saveTxs(txs);
  return w.current_balance;
}

export async function debitForTransfer({ amount, recipientId, recipientName, nonce }) {
  const amt = Math.round(amount);
  assertPositiveInt(amt);

  const w = loadWallet();
  if ((w.current_balance ?? 0) < amt) {
    throw new Error(`Solde insuffisant (${w.current_balance} F).`);
  }
  w.current_balance -= amt;
  saveWallet(w);

  const txs = loadTxs();
  txs.push({
    tx_id:           uuid(),
    type:            TX_TYPE.TRANSFER,
    amount:          amt,
    counterparty_id: recipientId ?? null,
    status:          TX_STATUS.PENDING_SYNC,
    description:     `Transfert à ${recipientName || recipientId || 'inconnu'}`,
    nonce:           nonce ?? null,
    created_at:      new Date().toISOString(),
  });
  saveTxs(txs);
  return w.current_balance;
}

export async function cancelTransfer(nonce) {
  if (!nonce) return null;
  const txs = loadTxs();
  const idx = txs.findIndex(
    (t) => t.nonce === nonce && t.type === TX_TYPE.TRANSFER && t.status === TX_STATUS.PENDING_SYNC,
  );
  if (idx === -1) return null;
  const tx = txs[idx];
  txs.splice(idx, 1);
  saveTxs(txs);

  const w = loadWallet();
  w.current_balance = (w.current_balance ?? 0) + tx.amount;
  saveWallet(w);
  return w.current_balance;
}

// ── Queries ────────────────────────────────────────────────────────────────

export async function getTransactions(limit = 50) {
  return loadTxs()
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, limit);
}

export async function getTransactionsByType(type, limit = 50) {
  return loadTxs()
    .filter((t) => t.type === type)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, limit);
}

export async function getPendingSyncCount() {
  return loadTxs().filter((t) => t.status === TX_STATUS.PENDING_SYNC).length;
}

// ── Secure store fallback (localStorage avec préfixe) ──────────────────────

export async function saveSecureValue(key, value) {
  if (_ls) _ls.setItem(K.secure + key, String(value));
}
export async function getSecureValue(key) {
  if (!_ls) return null;
  return _ls.getItem(K.secure + key);
}
export async function deleteSecureValue(key) {
  if (_ls) _ls.removeItem(K.secure + key);
}

// ══════════════════════════════════════════════════════════════════════════
//  Finances perso (parité avec financeService.js natif)
// ══════════════════════════════════════════════════════════════════════════

const loadBudgets  = () => _load(K.budgets, []);
const saveBudgets  = (v) => _save(K.budgets, v);
const loadEntries  = () => _load(K.manualEntries, []);
const saveEntries  = (v) => _save(K.manualEntries, v);
const loadGoals    = () => _load(K.savingsGoals, []);
const saveGoals    = (v) => _save(K.savingsGoals, v);
const loadContribs = () => _load(K.savingsContribs, []);
const saveContribs = (v) => _save(K.savingsContribs, v);

export function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

const _resolveTxCat = (tx) => tx.category || guessCategory(tx.description, tx.type);
const _INCOME_TYPES = [TX_TYPE.COLLECT, TX_TYPE.TOPUP];
const _now = () => new Date().toISOString();

// ── Catégorisation ──
export async function setTransactionCategory(txId, categoryId) {
  const txs = loadTxs();
  const tx = txs.find((t) => t.tx_id === txId);
  if (tx) { tx.category = categoryId; saveTxs(txs); }
}

// ── Saisie manuelle ──
export async function addManualEntry({ kind, amount, category, label = '', occurredAt = null }) {
  const amt = Math.round(amount);
  assertPositiveInt(amt);
  if (kind !== 'INCOME' && kind !== 'EXPENSE') throw new Error('Type d\'entrée invalide.');
  const entries = loadEntries();
  const id = uuid();
  entries.push({ id, kind, amount: amt, category: category ?? null, label: label.trim(), occurred_at: occurredAt ?? _now(), created_at: _now() });
  saveEntries(entries);
  return id;
}

export async function listManualEntries(limit = 100) {
  return loadEntries().sort((a, b) => b.occurred_at.localeCompare(a.occurred_at)).slice(0, limit);
}

export async function deleteManualEntry(id) {
  saveEntries(loadEntries().filter((e) => e.id !== id));
}

// ── Budgets ──
export async function setBudget(category, monthlyLimit) {
  const limit = Math.round(monthlyLimit);
  assertPositiveInt(limit);
  if (!category) throw new Error('Catégorie requise.');
  const budgets = loadBudgets();
  const existing = budgets.find((b) => b.category === category);
  if (existing) existing.monthly_limit = limit;
  else budgets.push({ id: uuid(), category, monthly_limit: limit, created_at: _now() });
  saveBudgets(budgets);
}

export async function deleteBudget(category) {
  saveBudgets(loadBudgets().filter((b) => b.category !== category));
}

export async function listBudgets() {
  return loadBudgets().sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export async function getBudgetStatus(month = currentMonth()) {
  const budgets = await listBudgets();
  const { byCategory } = await getMonthlySummary(month);
  const spentMap = Object.fromEntries(byCategory.map((b) => [b.category, b.amount]));
  return budgets.map((b) => {
    const spent = spentMap[b.category] ?? 0;
    return { ...b, spent, ratio: spent / b.monthly_limit };
  });
}

// ── Tableau de bord ──
export async function getMonthlySummary(month = currentMonth()) {
  const txs = loadTxs().filter((t) => (t.created_at ?? '').slice(0, 7) === month);
  const entries = loadEntries().filter((e) => (e.occurred_at ?? '').slice(0, 7) === month);

  let income = 0, expense = 0;
  const byCat = {};

  for (const tx of txs) {
    const cat = _resolveTxCat(tx);
    if (cat === SAVINGS_CATEGORY_ID) continue;
    if (_INCOME_TYPES.includes(tx.type)) income += tx.amount;
    else { expense += tx.amount; byCat[cat] = (byCat[cat] ?? 0) + tx.amount; }
  }
  for (const e of entries) {
    const cat = e.category || 'autre';
    if (e.kind === 'INCOME') income += e.amount;
    else { expense += e.amount; byCat[cat] = (byCat[cat] ?? 0) + e.amount; }
  }

  const byCategory = Object.entries(byCat)
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
  return { month, income, expense, net: income - expense, byCategory };
}

// ── Épargne ──
export async function createSavingsGoal({ name, targetAmount, contributionAmount, frequency, unlockDate }) {
  const target = Math.round(targetAmount);
  const contrib = Math.round(contributionAmount);
  assertPositiveInt(target);
  assertPositiveInt(contrib);
  if (!name?.trim()) throw new Error('Donnez un nom à votre coffre.');
  if (!['DAILY', 'WEEKLY', 'MONTHLY'].includes(frequency)) throw new Error('Fréquence invalide.');
  if (!unlockDate) throw new Error('Date de déblocage requise.');

  const goals = loadGoals();
  const goal = {
    id: uuid(), name: name.trim(), target_amount: target, current_amount: 0,
    contribution_amount: contrib, frequency, unlock_date: unlockDate,
    status: 'ACTIVE', last_contribution_at: null, created_at: _now(), updated_at: _now(),
  };
  goals.push(goal);
  saveGoals(goals);
  return goal;
}

export async function getSavingsGoal(id) {
  return loadGoals().find((g) => g.id === id) ?? null;
}

export async function listSavingsGoals() {
  return loadGoals().sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function depositToSavings(goalId, amount) {
  const amt = Math.round(amount);
  assertPositiveInt(amt);

  const goals = loadGoals();
  const goal = goals.find((g) => g.id === goalId);
  if (!goal) throw new Error('Coffre introuvable.');
  if (goal.status === 'UNLOCKED' || goal.status === 'BROKEN') throw new Error('Ce coffre est déjà débloqué.');

  const w = loadWallet();
  const current = w.current_balance ?? 0;
  if (current < amt) throw new Error(`Solde insuffisant (${current} F).`);
  w.current_balance = current - amt;
  w.updated_at = _now();
  saveWallet(w);

  const txs = loadTxs();
  txs.push({
    tx_id: uuid(), type: TX_TYPE.WITHDRAW, amount: amt, counterparty_id: null,
    status: TX_STATUS.PENDING_SYNC, description: `Épargne : ${goal.name}`,
    nonce: null, category: SAVINGS_CATEGORY_ID, created_at: _now(),
  });
  saveTxs(txs);

  goal.current_amount = (goal.current_amount ?? 0) + amt;
  goal.last_contribution_at = _now();
  goal.status = goal.current_amount >= goal.target_amount ? 'COMPLETED' : 'ACTIVE';
  goal.updated_at = _now();
  saveGoals(goals);

  const contribs = loadContribs();
  contribs.push({ id: uuid(), goal_id: goalId, amount: amt, created_at: _now() });
  saveContribs(contribs);

  return { balance: w.current_balance, goal };
}

export async function withdrawFromSavings(goalId, { early = false } = {}) {
  const goals = loadGoals();
  const goal = goals.find((g) => g.id === goalId);
  if (!goal) throw new Error('Coffre introuvable.');
  if (goal.status === 'UNLOCKED' || goal.status === 'BROKEN') throw new Error('Ce coffre est déjà débloqué.');

  const matured = new Date() >= new Date(String(goal.unlock_date).replace(' ', 'T'));
  if (!matured && !early) throw new Error(`Coffre bloqué jusqu'au ${String(goal.unlock_date).slice(0, 10)}.`);

  const pot = goal.current_amount ?? 0;
  const w = loadWallet();
  if (pot > 0) {
    w.current_balance = (w.current_balance ?? 0) + pot;
    w.updated_at = _now();
    saveWallet(w);
    const txs = loadTxs();
    txs.push({
      tx_id: uuid(), type: TX_TYPE.TOPUP, amount: pot, counterparty_id: null,
      status: TX_STATUS.PENDING_SYNC, description: `Déblocage épargne : ${goal.name}`,
      nonce: null, category: SAVINGS_CATEGORY_ID, created_at: _now(),
    });
    saveTxs(txs);
  }

  goal.current_amount = 0;
  goal.status = matured ? 'UNLOCKED' : 'BROKEN';
  goal.updated_at = _now();
  saveGoals(goals);

  return { balance: w.current_balance ?? 0, goal };
}

function _nextDueDate(goal) {
  const base = goal.last_contribution_at || goal.created_at;
  const d = new Date(String(base).replace(' ', 'T'));
  if (goal.frequency === 'DAILY')       d.setDate(d.getDate() + 1);
  else if (goal.frequency === 'WEEKLY') d.setDate(d.getDate() + 7);
  else                                   d.setMonth(d.getMonth() + 1);
  return d;
}

export async function getOverdueGoals() {
  const goals = await listSavingsGoals();
  const now = new Date();
  return goals
    .filter((g) => g.status === 'ACTIVE' && now > _nextDueDate(g))
    .map((g) => ({
      ...g,
      dueDate: _nextDueDate(g).toISOString(),
      daysLate: Math.floor((now - _nextDueDate(g)) / 86_400_000),
    }));
}
