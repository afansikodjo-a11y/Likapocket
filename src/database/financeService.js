/**
 * Finances perso — couche données native (SQLite).
 *
 * Réutilise les patterns de walletService.js : getDatabase, generateUUID,
 * withTransactionAsync. Les mouvements d'épargne réutilisent les types de
 * transaction existants (WITHDRAW = dépôt vers coffre, TOPUP = déblocage) pour
 * ne PAS casser la synchro Supabase. Le solde du coffre est suivi à part.
 *
 * ⚠️ Toute fonction ici doit avoir un équivalent dans index.web.js (parité web).
 */

import { getDatabase, generateUUID } from './db';
import { TX_TYPE, TX_STATUS } from '../theme';
import { guessCategory, SAVINGS_CATEGORY_ID } from '../data/financeCategories';

// ── Guards ─────────────────────────────────────────────────────────────────
function assertPositiveInt(amount) {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error(`Le montant doit être un entier positif en CFA (reçu : ${amount}).`);
  }
}

export function currentMonth() {
  return new Date().toISOString().slice(0, 7); // 'YYYY-MM'
}

function resolveTxCategory(tx) {
  return tx.category || guessCategory(tx.description, tx.type);
}

const INCOME_TYPES = [TX_TYPE.COLLECT, TX_TYPE.TOPUP];

// ── Catégorisation ──────────────────────────────────────────────────────────

export async function setTransactionCategory(txId, categoryId) {
  if (!txId) throw new Error('Transaction introuvable.');
  const db = await getDatabase();
  await db.runAsync('UPDATE transactions SET category = ? WHERE tx_id = ?', [categoryId, txId]);
}

// ── Saisie manuelle (espèces hors-app) ──────────────────────────────────────

export async function addManualEntry({ kind, amount, category, label = '', occurredAt = null }) {
  const amt = Math.round(amount);
  assertPositiveInt(amt);
  if (kind !== 'INCOME' && kind !== 'EXPENSE') throw new Error('Type d\'entrée invalide.');

  const db = await getDatabase();
  const id = await generateUUID();
  await db.runAsync(
    `INSERT INTO manual_entries (id, kind, amount, category, label, occurred_at)
     VALUES (?, ?, ?, ?, ?, COALESCE(?, datetime('now')))`,
    [id, kind, amt, category ?? null, label.trim(), occurredAt],
  );
  return id;
}

export async function listManualEntries(limit = 100) {
  const db = await getDatabase();
  return db.getAllAsync(
    'SELECT * FROM manual_entries ORDER BY occurred_at DESC LIMIT ?', [limit],
  );
}

export async function deleteManualEntry(id) {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM manual_entries WHERE id = ?', [id]);
}

// ── Budgets ─────────────────────────────────────────────────────────────────

export async function setBudget(category, monthlyLimit) {
  const limit = Math.round(monthlyLimit);
  assertPositiveInt(limit);
  if (!category) throw new Error('Catégorie requise.');

  const db = await getDatabase();
  const id = await generateUUID();
  await db.runAsync(
    `INSERT INTO budgets (id, category, monthly_limit) VALUES (?, ?, ?)
     ON CONFLICT(category) DO UPDATE SET monthly_limit = excluded.monthly_limit`,
    [id, category, limit],
  );
}

export async function deleteBudget(category) {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM budgets WHERE category = ?', [category]);
}

export async function listBudgets() {
  const db = await getDatabase();
  return db.getAllAsync('SELECT * FROM budgets ORDER BY created_at ASC');
}

/** Statut des budgets du mois : { category, monthly_limit, spent, ratio }. */
export async function getBudgetStatus(month = currentMonth()) {
  const budgets = await listBudgets();
  const { byCategory } = await getMonthlySummary(month);
  const spentMap = Object.fromEntries(byCategory.map((b) => [b.category, b.amount]));
  return budgets.map((b) => {
    const spent = spentMap[b.category] ?? 0;
    return { ...b, spent, ratio: spent / b.monthly_limit };
  });
}

// ── Tableau de bord mensuel ─────────────────────────────────────────────────

/**
 * @returns {{ month, income, expense, net, byCategory: {category, amount}[] }}
 * Les mouvements d'épargne (catégorie SAVINGS_CATEGORY_ID) sont exclus :
 * déplacer de l'argent vers un coffre n'est ni une dépense ni un revenu.
 */
export async function getMonthlySummary(month = currentMonth()) {
  const db = await getDatabase();
  const txs = await db.getAllAsync(
    "SELECT * FROM transactions WHERE strftime('%Y-%m', created_at) = ?", [month],
  );
  const entries = await db.getAllAsync(
    "SELECT * FROM manual_entries WHERE strftime('%Y-%m', occurred_at) = ?", [month],
  );

  let income = 0, expense = 0;
  const byCat = {};

  for (const tx of txs) {
    const cat = resolveTxCategory(tx);
    if (cat === SAVINGS_CATEGORY_ID) continue; // mouvement interne au coffre
    if (INCOME_TYPES.includes(tx.type)) {
      income += tx.amount;
    } else {
      expense += tx.amount;
      byCat[cat] = (byCat[cat] ?? 0) + tx.amount;
    }
  }

  for (const e of entries) {
    const cat = e.category || 'autre';
    if (e.kind === 'INCOME') {
      income += e.amount;
    } else {
      expense += e.amount;
      byCat[cat] = (byCat[cat] ?? 0) + e.amount;
    }
  }

  const byCategory = Object.entries(byCat)
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);

  return { month, income, expense, net: income - expense, byCategory };
}

// ── Épargne bloquée (coffres) ───────────────────────────────────────────────

export async function createSavingsGoal({ name, targetAmount, contributionAmount, frequency, unlockDate }) {
  const target = Math.round(targetAmount);
  const contrib = Math.round(contributionAmount);
  assertPositiveInt(target);
  assertPositiveInt(contrib);
  if (!name?.trim()) throw new Error('Donnez un nom à votre coffre.');
  if (!['DAILY', 'WEEKLY', 'MONTHLY'].includes(frequency)) throw new Error('Fréquence invalide.');
  if (!unlockDate) throw new Error('Date de déblocage requise.');

  const db = await getDatabase();
  const id = await generateUUID();
  await db.runAsync(
    `INSERT INTO savings_goals
       (id, name, target_amount, contribution_amount, frequency, unlock_date)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, name.trim(), target, contrib, frequency, unlockDate],
  );
  return getSavingsGoal(id);
}

export async function getSavingsGoal(id) {
  const db = await getDatabase();
  return db.getFirstAsync('SELECT * FROM savings_goals WHERE id = ?', [id]);
}

export async function listSavingsGoals() {
  const db = await getDatabase();
  return db.getAllAsync('SELECT * FROM savings_goals ORDER BY created_at DESC');
}

/**
 * Dépôt vers un coffre : débite le solde Lika et crédite le coffre.
 * Enregistre une transaction WITHDRAW (category=epargne) → sync-safe.
 */
export async function depositToSavings(goalId, amount) {
  const amt = Math.round(amount);
  assertPositiveInt(amt);

  const db = await getDatabase();
  const txId = await generateUUID();
  const contribId = await generateUUID();
  let newBalance, goal;

  await db.withTransactionAsync(async () => {
    goal = await db.getFirstAsync('SELECT * FROM savings_goals WHERE id = ?', [goalId]);
    if (!goal) throw new Error('Coffre introuvable.');
    if (goal.status === 'UNLOCKED' || goal.status === 'BROKEN') {
      throw new Error('Ce coffre est déjà débloqué.');
    }

    const w = await db.getFirstAsync('SELECT current_balance FROM wallet WHERE id = 1');
    const current = w?.current_balance ?? 0;
    if (current < amt) throw new Error(`Solde insuffisant (${current} F).`);

    newBalance = current - amt;
    await db.runAsync(
      "UPDATE wallet SET current_balance = ?, updated_at = datetime('now') WHERE id = 1",
      [newBalance],
    );
    await db.runAsync(
      `INSERT INTO transactions (tx_id, type, amount, status, description, category)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [txId, TX_TYPE.WITHDRAW, amt, TX_STATUS.PENDING_SYNC, `Épargne : ${goal.name}`, SAVINGS_CATEGORY_ID],
    );

    const newAmount = (goal.current_amount ?? 0) + amt;
    const newStatus = newAmount >= goal.target_amount ? 'COMPLETED' : 'ACTIVE';
    await db.runAsync(
      `UPDATE savings_goals
         SET current_amount = ?, last_contribution_at = datetime('now'),
             status = ?, updated_at = datetime('now')
       WHERE id = ?`,
      [newAmount, newStatus, goalId],
    );
    await db.runAsync(
      'INSERT INTO savings_contributions (id, goal_id, amount) VALUES (?, ?, ?)',
      [contribId, goalId, amt],
    );
  });

  goal = await getSavingsGoal(goalId);
  return { balance: newBalance, goal };
}

/**
 * Déblocage d'un coffre : recrédite le solde Lika du montant accumulé.
 * Avant l'échéance, exige `early=true` (le coffre devient BROKEN).
 */
export async function withdrawFromSavings(goalId, { early = false } = {}) {
  const db = await getDatabase();
  const txId = await generateUUID();
  let newBalance, goal;

  await db.withTransactionAsync(async () => {
    goal = await db.getFirstAsync('SELECT * FROM savings_goals WHERE id = ?', [goalId]);
    if (!goal) throw new Error('Coffre introuvable.');
    if (goal.status === 'UNLOCKED' || goal.status === 'BROKEN') {
      throw new Error('Ce coffre est déjà débloqué.');
    }

    const now = new Date();
    const unlock = new Date(String(goal.unlock_date).replace(' ', 'T'));
    const matured = now >= unlock;
    if (!matured && !early) {
      throw new Error(`Coffre bloqué jusqu'au ${goal.unlock_date.slice(0, 10)}.`);
    }

    const pot = goal.current_amount ?? 0;
    const finalStatus = matured ? 'UNLOCKED' : 'BROKEN';

    if (pot > 0) {
      const w = await db.getFirstAsync('SELECT current_balance FROM wallet WHERE id = 1');
      newBalance = (w?.current_balance ?? 0) + pot;
      await db.runAsync(
        "UPDATE wallet SET current_balance = ?, updated_at = datetime('now') WHERE id = 1",
        [newBalance],
      );
      await db.runAsync(
        `INSERT INTO transactions (tx_id, type, amount, status, description, category)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [txId, TX_TYPE.TOPUP, pot, TX_STATUS.PENDING_SYNC, `Déblocage épargne : ${goal.name}`, SAVINGS_CATEGORY_ID],
      );
    } else {
      const w = await db.getFirstAsync('SELECT current_balance FROM wallet WHERE id = 1');
      newBalance = w?.current_balance ?? 0;
    }

    await db.runAsync(
      `UPDATE savings_goals
         SET current_amount = 0, status = ?, updated_at = datetime('now')
       WHERE id = ?`,
      [finalStatus, goalId],
    );
  });

  goal = await getSavingsGoal(goalId);
  return { balance: newBalance, goal };
}

// ── Rappels de retard ───────────────────────────────────────────────────────

function nextDueDate(goal) {
  const base = goal.last_contribution_at || goal.created_at;
  const d = new Date(String(base).replace(' ', 'T') + 'Z');
  if (goal.frequency === 'DAILY')       d.setUTCDate(d.getUTCDate() + 1);
  else if (goal.frequency === 'WEEKLY') d.setUTCDate(d.getUTCDate() + 7);
  else                                   d.setUTCMonth(d.getUTCMonth() + 1);
  return d;
}

/** Coffres actifs dont la prochaine cotisation est en retard. */
export async function getOverdueGoals() {
  const goals = await listSavingsGoals();
  const now = new Date();
  return goals
    .filter((g) => g.status === 'ACTIVE' && now > nextDueDate(g))
    .map((g) => ({
      ...g,
      dueDate: nextDueDate(g).toISOString(),
      daysLate: Math.floor((now - nextDueDate(g)) / 86_400_000),
    }));
}
