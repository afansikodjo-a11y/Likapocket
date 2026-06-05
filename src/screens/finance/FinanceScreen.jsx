import { useCallback, useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, StatusBar, Platform, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  PiggyBank, TrendingDown, TrendingUp, Plus, Minus,
  Wallet, AlertTriangle, ChevronRight, Lock, Target,
} from 'lucide-react-native';
import {
  getMonthlySummary, getBudgetStatus, listSavingsGoals, getOverdueGoals, currentMonth,
} from '../../database';
import { getCategory } from '../../data/financeCategories';
import { categoryIcon } from './categoryIcons';
import { COLORS, FONT, SPACE } from '../../theme';

const fmt = (n) => (n ?? 0).toLocaleString('fr-FR');

function monthLabel(month) {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}

const STATUS_META = {
  ACTIVE:    { label: 'En cours',  color: COLORS.gold,    bg: COLORS.goldSoft },
  COMPLETED: { label: 'Objectif atteint', color: COLORS.success, bg: COLORS.successSoft },
  UNLOCKED:  { label: 'Débloqué',  color: COLORS.grey,    bg: COLORS.greySoft },
  BROKEN:    { label: 'Rompu',     color: COLORS.error,   bg: COLORS.errorSoft },
};

export default function FinanceScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [summary, setSummary] = useState(null);
  const [budgets, setBudgets] = useState([]);
  const [goals,   setGoals]   = useState([]);
  const [overdue, setOverdue] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const month = currentMonth();
    const [sum, bud, gls, ovd] = await Promise.all([
      getMonthlySummary(month),
      getBudgetStatus(month),
      listSavingsGoals(),
      getOverdueGoals(),
    ]);
    setSummary(sum); setBudgets(bud); setGoals(gls); setOverdue(ovd);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await load(); } finally { setRefreshing(false); }
  }, [load]);

  const activeGoals = goals.filter((g) => g.status === 'ACTIVE' || g.status === 'COMPLETED');

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />

      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.headerOver}>MES FINANCES</Text>
          <Text style={s.headerTitle}>
            <Text style={s.titleGold}>Suivi</Text>
            <Text style={s.titleBlack}> & Épargne</Text>
          </Text>
        </View>
        <View style={s.headerIcon}>
          <PiggyBank size={18} color={COLORS.gold} strokeWidth={2} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.gold} colors={[COLORS.gold]} />
        }
      >
        {/* Résumé du mois */}
        <LinearGradient
          colors={['#D69E4E', '#B5822D']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={s.summaryCard}
        >
          <Text style={s.summaryMonth}>{summary ? monthLabel(summary.month) : '—'}</Text>
          <View style={s.summaryRow}>
            <View style={s.summaryCol}>
              <View style={s.summaryColHead}>
                <TrendingUp size={13} color="rgba(255,255,255,0.9)" strokeWidth={2.4} />
                <Text style={s.summaryColLbl}>Entrées</Text>
              </View>
              <Text style={s.summaryColVal}>{fmt(summary?.income)} F</Text>
            </View>
            <View style={s.summaryDivider} />
            <View style={s.summaryCol}>
              <View style={s.summaryColHead}>
                <TrendingDown size={13} color="rgba(255,255,255,0.9)" strokeWidth={2.4} />
                <Text style={s.summaryColLbl}>Sorties</Text>
              </View>
              <Text style={s.summaryColVal}>{fmt(summary?.expense)} F</Text>
            </View>
          </View>
          <View style={s.netPill}>
            <Text style={s.netLbl}>Solde du mois</Text>
            <Text style={s.netVal}>{summary && summary.net >= 0 ? '+' : ''}{fmt(summary?.net)} F</Text>
          </View>
        </LinearGradient>

        {/* Rappels de retard */}
        {overdue.length > 0 && (
          <View style={s.reminderBox}>
            <AlertTriangle size={16} color={COLORS.warning} strokeWidth={2.2} />
            <Text style={s.reminderTxt}>
              {overdue.length === 1
                ? `Cotisation en retard pour « ${overdue[0].name} »`
                : `${overdue.length} coffres ont une cotisation en retard`}
            </Text>
          </View>
        )}

        {/* Saisie rapide */}
        <View style={s.quickRow}>
          <TouchableOpacity
            style={s.quickBtn}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('ManualEntry', { kind: 'EXPENSE' })}
          >
            <View style={[s.quickIcon, { backgroundColor: COLORS.errorSoft }]}>
              <Minus size={18} color={COLORS.error} strokeWidth={2.6} />
            </View>
            <Text style={s.quickLbl}>Dépense</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.quickBtn}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('ManualEntry', { kind: 'INCOME' })}
          >
            <View style={[s.quickIcon, { backgroundColor: COLORS.successSoft }]}>
              <Plus size={18} color={COLORS.success} strokeWidth={2.6} />
            </View>
            <Text style={s.quickLbl}>Revenu</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.quickBtn}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('Budgets')}
          >
            <View style={[s.quickIcon, { backgroundColor: COLORS.goldSoft }]}>
              <Target size={18} color={COLORS.gold} strokeWidth={2.4} />
            </View>
            <Text style={s.quickLbl}>Budgets</Text>
          </TouchableOpacity>
        </View>

        {/* Dépenses par catégorie */}
        {summary?.byCategory?.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Dépenses par catégorie</Text>
            <View style={s.card}>
              {summary.byCategory.slice(0, 6).map((row, i) => {
                const cat = getCategory(row.category);
                const Icon = categoryIcon(cat.icon);
                const pct = summary.expense > 0 ? Math.round((row.amount / summary.expense) * 100) : 0;
                return (
                  <View key={row.category} style={[s.catRow, i > 0 && s.catRowBorder]}>
                    <View style={[s.catIcon, { backgroundColor: cat.bg }]}>
                      <Icon size={16} color={cat.color} strokeWidth={2.2} />
                    </View>
                    <View style={s.catBody}>
                      <Text style={s.catLabel}>{cat.label}</Text>
                      <View style={s.catBarTrack}>
                        <View style={[s.catBarFill, { width: `${pct}%`, backgroundColor: cat.color }]} />
                      </View>
                    </View>
                    <Text style={s.catAmount}>{fmt(row.amount)} F</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Budgets (aperçu) */}
        {budgets.length > 0 && (
          <View style={s.section}>
            <TouchableOpacity style={s.sectionHead} onPress={() => navigation.navigate('Budgets')} activeOpacity={0.7}>
              <Text style={s.sectionTitle}>Budgets du mois</Text>
              <ChevronRight size={18} color={COLORS.grey} strokeWidth={2.2} />
            </TouchableOpacity>
            <View style={s.card}>
              {budgets.slice(0, 4).map((b, i) => {
                const cat = getCategory(b.category);
                const ratio = Math.min(b.ratio, 1);
                const over = b.ratio >= 1;
                const warn = b.ratio >= 0.8 && !over;
                const barColor = over ? COLORS.error : warn ? COLORS.warning : COLORS.success;
                return (
                  <View key={b.id} style={[s.catRow, i > 0 && s.catRowBorder]}>
                    <View style={s.catBody}>
                      <View style={s.budgetTop}>
                        <Text style={s.catLabel}>{cat.label}</Text>
                        <Text style={[s.budgetSpent, { color: barColor }]}>
                          {fmt(b.spent)} / {fmt(b.monthly_limit)} F
                        </Text>
                      </View>
                      <View style={s.catBarTrack}>
                        <View style={[s.catBarFill, { width: `${ratio * 100}%`, backgroundColor: barColor }]} />
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Coffres d'épargne */}
        <View style={s.section}>
          <View style={s.sectionHead}>
            <Text style={s.sectionTitle}>Coffres d'épargne</Text>
          </View>

          {activeGoals.map((g) => {
            const meta = STATUS_META[g.status] ?? STATUS_META.ACTIVE;
            const ratio = Math.min((g.current_amount ?? 0) / g.target_amount, 1);
            const late = overdue.some((o) => o.id === g.id);
            return (
              <TouchableOpacity
                key={g.id}
                style={s.goalCard}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('SavingsGoal', { goalId: g.id })}
              >
                <View style={s.goalHead}>
                  <View style={s.goalTitleRow}>
                    <Lock size={13} color={COLORS.gold} strokeWidth={2.2} />
                    <Text style={s.goalName} numberOfLines={1}>{g.name}</Text>
                  </View>
                  <View style={[s.statusBadge, { backgroundColor: meta.bg }]}>
                    <Text style={[s.statusTxt, { color: meta.color }]}>{meta.label}</Text>
                  </View>
                </View>

                <View style={s.goalAmtRow}>
                  <Text style={s.goalCurrent}>{fmt(g.current_amount)} F</Text>
                  <Text style={s.goalTarget}>/ {fmt(g.target_amount)} F</Text>
                </View>

                <View style={s.catBarTrack}>
                  <View style={[s.catBarFill, { width: `${ratio * 100}%`, backgroundColor: g.status === 'COMPLETED' ? COLORS.success : COLORS.gold }]} />
                </View>

                <Text style={[s.goalFoot, late && { color: COLORS.warning, fontWeight: '700' }]}>
                  {late ? '⚠ Cotisation en retard' : `Déblocage le ${String(g.unlock_date).slice(0, 10)}`}
                </Text>
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity
            style={s.newGoalBtn}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('SavingsGoal', {})}
          >
            <Plus size={18} color={COLORS.gold} strokeWidth={2.4} />
            <Text style={s.newGoalTxt}>Nouveau coffre d'épargne</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.footnote}>
          Ton argent placé dans un coffre quitte ton solde dépensable et y revient au déblocage.
        </Text>
      </ScrollView>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const RADIUS = 20;
const SHADOW = Platform.select({
  ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 12 },
  default: { elevation: 3 },
});

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACE.lg, paddingVertical: 14,
  },
  headerOver: { fontFamily: FONT, fontSize: 10, color: COLORS.grey, fontWeight: '700', letterSpacing: 1.5 },
  headerTitle:{ fontFamily: FONT, fontSize: 20, fontWeight: '800', letterSpacing: -0.5, marginTop: 2 },
  titleGold:  { color: COLORS.gold },
  titleBlack: { color: COLORS.black },
  headerIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.goldSoft, alignItems: 'center', justifyContent: 'center' },

  // Résumé
  summaryCard: { marginHorizontal: SPACE.lg, marginTop: 4, marginBottom: 16, borderRadius: RADIUS, padding: 20, ...SHADOW },
  summaryMonth:{ fontFamily: FONT, fontSize: 11, fontWeight: '700', letterSpacing: 1, color: 'rgba(255,255,255,0.85)', textTransform: 'capitalize', marginBottom: 14 },
  summaryRow:  { flexDirection: 'row', alignItems: 'center' },
  summaryCol:  { flex: 1 },
  summaryColHead: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 6 },
  summaryColLbl:  { fontFamily: FONT, fontSize: 11, color: 'rgba(255,255,255,0.85)', fontWeight: '600' },
  summaryColVal:  { fontFamily: FONT, fontSize: 19, color: '#FFF', fontWeight: '800', letterSpacing: -0.5 },
  summaryDivider: { width: 1, height: 36, backgroundColor: 'rgba(255,255,255,0.25)', marginHorizontal: 14 },
  netPill: { marginTop: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  netLbl:  { fontFamily: FONT, fontSize: 12, color: 'rgba(255,255,255,0.9)', fontWeight: '600' },
  netVal:  { fontFamily: FONT, fontSize: 15, color: '#FFF', fontWeight: '800', letterSpacing: -0.3 },

  // Rappel
  reminderBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: COLORS.warningSoft, borderRadius: 14,
    marginHorizontal: SPACE.lg, marginBottom: 14, paddingHorizontal: 12, paddingVertical: 11,
  },
  reminderTxt: { flex: 1, fontFamily: FONT, fontSize: 12, color: COLORS.warning, fontWeight: '600', lineHeight: 17 },

  // Saisie rapide
  quickRow: { flexDirection: 'row', paddingHorizontal: SPACE.lg, gap: 12, marginBottom: 8 },
  quickBtn: { flex: 1, backgroundColor: '#FFF', borderRadius: 16, paddingVertical: 14, alignItems: 'center', ...SHADOW },
  quickIcon:{ width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  quickLbl: { fontFamily: FONT, fontSize: 12, fontWeight: '700', color: COLORS.black },

  // Sections
  section: { paddingHorizontal: SPACE.lg, marginTop: 16 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sectionTitle: { fontFamily: FONT, fontSize: 14, fontWeight: '800', color: COLORS.black, letterSpacing: -0.2, marginBottom: 10 },
  card: { backgroundColor: '#FFF', borderRadius: RADIUS, padding: 6, ...SHADOW },

  catRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 12 },
  catRowBorder: { borderTopWidth: 1, borderTopColor: '#F4F4F4' },
  catIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  catBody: { flex: 1 },
  catLabel: { fontFamily: FONT, fontSize: 13, fontWeight: '700', color: COLORS.black, marginBottom: 6 },
  catBarTrack: { height: 6, borderRadius: 3, backgroundColor: '#EFEFEF', overflow: 'hidden' },
  catBarFill: { height: 6, borderRadius: 3 },
  catAmount: { fontFamily: FONT, fontSize: 13, fontWeight: '800', color: COLORS.black, letterSpacing: -0.3 },

  budgetTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  budgetSpent: { fontFamily: FONT, fontSize: 11, fontWeight: '700' },

  // Coffres
  goalCard: { backgroundColor: '#FFF', borderRadius: RADIUS, padding: 16, marginBottom: 12, ...SHADOW },
  goalHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  goalTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, marginRight: 8 },
  goalName: { fontFamily: FONT, fontSize: 15, fontWeight: '800', color: COLORS.black, letterSpacing: -0.3, flexShrink: 1 },
  statusBadge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10 },
  statusTxt: { fontFamily: FONT, fontSize: 10, fontWeight: '700', letterSpacing: 0.2 },
  goalAmtRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 8 },
  goalCurrent: { fontFamily: FONT, fontSize: 20, fontWeight: '800', color: COLORS.gold, letterSpacing: -0.5 },
  goalTarget: { fontFamily: FONT, fontSize: 13, fontWeight: '600', color: COLORS.grey },
  goalFoot: { fontFamily: FONT, fontSize: 11, color: COLORS.grey, fontWeight: '600', marginTop: 8 },

  newGoalBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.goldSoft, borderRadius: 16, paddingVertical: 14,
    borderWidth: 1, borderColor: COLORS.gold, borderStyle: 'dashed',
  },
  newGoalTxt: { fontFamily: FONT, fontSize: 14, fontWeight: '700', color: COLORS.gold },

  footnote: { paddingHorizontal: SPACE.lg, marginTop: 18, fontFamily: FONT, fontSize: 11, color: COLORS.grey, lineHeight: 16, textAlign: 'center' },
});
