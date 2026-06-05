import { useCallback, useState, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, ScrollView,
  StyleSheet, Platform, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import {
  ArrowDownLeft, ArrowUpRight, ArrowRightLeft, TrendingUp,
  Clock, CheckCircle2, FileText, Filter,
} from 'lucide-react-native';
import { getTransactions } from '../database';
import TransactionDetailModal from '../components/TransactionDetailModal';
import { COLORS, FONT, SPACE, TX_TYPE, TX_STATUS, SYNC_DISPLAY } from '../theme';

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDateLong(iso) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function groupByDate(items) {
  const groups = {};
  items.forEach((tx) => {
    const d        = new Date(tx.created_at);
    const today    = new Date();
    const diffDays = Math.floor((today - d) / 86_400_000);
    let key;
    if (diffDays === 0)      key = "Aujourd'hui";
    else if (diffDays === 1) key = 'Hier';
    else if (diffDays < 7)   key = 'Cette semaine';
    else                     key = d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

    (groups[key] = groups[key] || []).push(tx);
  });
  // Flatten with section headers
  const flat = [];
  Object.entries(groups).forEach(([title, txs]) => {
    flat.push({ __header: true, title });
    flat.push(...txs);
  });
  return flat;
}

function txMeta(type) {
  switch (type) {
    case TX_TYPE.COLLECT:  return { Icon: ArrowDownLeft,  color: COLORS.success, bg: COLORS.successSoft, label: 'Reliquat reçu' };
    case TX_TYPE.TRANSFER: return { Icon: ArrowUpRight,   color: COLORS.grey,    bg: COLORS.greySoft,    label: 'Transfert' };
    case TX_TYPE.TOPUP:    return { Icon: TrendingUp,     color: COLORS.gold,    bg: COLORS.goldSoft,    label: 'Recharge' };
    case TX_TYPE.WITHDRAW: return { Icon: ArrowRightLeft, color: COLORS.error,   bg: COLORS.errorSoft,   label: 'Retrait' };
    default:               return { Icon: ArrowUpRight,   color: COLORS.grey,    bg: COLORS.greySoft,    label: type };
  }
}

// ── Filter chips ───────────────────────────────────────────────────────────

const FILTERS = [
  { key: 'all',    label: 'Tout' },
  { key: 'COLLECT', label: 'Reçus' },
  { key: 'TRANSFER', label: 'Transferts' },
  { key: 'TOPUP',    label: 'Recharges' },
  { key: 'WITHDRAW', label: 'Retraits' },
];

function FilterRow({ active, onChange }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={s.filterRow}
      style={s.filterScroll}
    >
      {FILTERS.map((item) => {
        const on = item.key === active;
        return (
          <TouchableOpacity
            key={item.key}
            style={[s.chip, on && s.chipActive]}
            onPress={() => onChange(item.key)}
            activeOpacity={0.85}
          >
            <Text style={[s.chipTxt, on && s.chipTxtActive]}>{item.label}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

// ── Transaction card ───────────────────────────────────────────────────────

function TxCard({ item, onPress }) {
  const isInflow = item.type === TX_TYPE.COLLECT || item.type === TX_TYPE.TOPUP;
  const { Icon, color, bg, label } = txMeta(item.type);
  const sync = SYNC_DISPLAY[item.status] ?? { label: item.status, color: COLORS.grey, bg: COLORS.greySoft };
  const SyncIcon = item.status === TX_STATUS.PENDING_SYNC ? Clock : CheckCircle2;

  return (
    <TouchableOpacity style={s.txCard} onPress={() => onPress?.(item)} activeOpacity={0.75}>
      <View style={[s.txIcon, { backgroundColor: bg }]}>
        <Icon size={18} color={color} strokeWidth={2.2} />
      </View>

      <View style={s.txBody}>
        <Text style={s.txDesc} numberOfLines={1}>{item.description || label}</Text>
        <View style={s.txMetaRow}>
          <Text style={s.txDate}>{formatDateLong(item.created_at)}</Text>
          {item.counterparty_id && <Text style={s.txMid}>· {item.counterparty_id}</Text>}
        </View>
        <View style={[s.syncPill, { backgroundColor: sync.bg }]}>
          <SyncIcon size={9} color={sync.color} strokeWidth={2.5} />
          <Text style={[s.syncLabel, { color: sync.color }]}>{sync.label}</Text>
        </View>
      </View>

      <Text style={[s.txAmount, { color: isInflow ? COLORS.success : COLORS.black }]}>
        {isInflow ? '+' : '−'}{item.amount.toLocaleString('fr-FR')}
        <Text style={s.txCur}> F</Text>
      </Text>
    </TouchableOpacity>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState('all');

  const [refreshing,   setRefreshing] = useState(false);
  const [selectedTx,   setSelectedTx] = useState(null);

  const loadData = useCallback(async () => {
    const data = await getTransactions(100);
    setTransactions(data);
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadData().finally(() => setLoading(false));
    }, [loadData]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await loadData(); } finally { setRefreshing(false); }
  }, [loadData]);

  const data = useMemo(() => {
    const filtered = filter === 'all'
      ? transactions
      : transactions.filter((t) => t.type === filter);
    return groupByDate(filtered);
  }, [transactions, filter]);

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* ── Header ── */}
      <View style={s.header}>
        <View>
          <Text style={s.overline}>MOUVEMENTS</Text>
          <Text style={s.title}>Historique</Text>
        </View>
        <View style={s.totalChip}>
          <FileText size={12} color={COLORS.gold} strokeWidth={2.2} />
          <Text style={s.totalTxt}>{transactions.length} tx</Text>
        </View>
      </View>

      <FilterRow active={filter} onChange={setFilter} />

      {/* ── List ── */}
      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color={COLORS.gold} />
        </View>
      ) : (
        <FlatList
          style={{ flex: 1 }}
          data={data}
          keyExtractor={(item, idx) => item.__header ? `h-${item.title}-${idx}` : String(item.tx_id ?? item.id)}
          renderItem={({ item }) =>
            item.__header
              ? <Text style={s.sectionHeader}>{item.title}</Text>
              : <TxCard item={item} onPress={setSelectedTx} />
          }
          contentContainerStyle={{ paddingTop: 4, paddingBottom: insets.bottom + 32, flexGrow: 1 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.gold} colors={[COLORS.gold]} />
          }
          ListEmptyComponent={
            <View style={s.empty}>
              <View style={s.emptyIcon}>
                <FileText size={32} color={COLORS.greyLight} strokeWidth={1.8} />
              </View>
              <Text style={s.emptyTitle}>Aucune transaction</Text>
              <Text style={s.emptyBody}>
                Tes transactions apparaîtront ici dès que tu auras envoyé ou reçu un reliquat.
              </Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      <TransactionDetailModal
        visible={!!selectedTx}
        transaction={selectedTx}
        onClose={() => setSelectedTx(null)}
      />
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const RADIUS = 20;
const SHADOW = Platform.select({
  ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 10 },
  default: { elevation: 2 },
});

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACE.lg, paddingVertical: 16,
  },
  overline: { fontFamily: FONT, fontSize: 10, fontWeight: '700', letterSpacing: 2.5, color: COLORS.grey, marginBottom: 4 },
  title:    { fontFamily: FONT, fontSize: 22, fontWeight: '800', color: COLORS.black, letterSpacing: -0.5 },
  totalChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: COLORS.goldSoft, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12,
  },
  totalTxt: { fontFamily: FONT, fontSize: 11, fontWeight: '700', color: COLORS.gold },

  // Filter chips
  // ScrollView outer : empêche l'expansion verticale sur web
  filterScroll: { flexGrow: 0, flexShrink: 0 },
  // ContentContainer : padding interne
  filterRow: {
    paddingHorizontal: SPACE.lg, paddingVertical: 12,
    alignItems: 'center', gap: 8,
  },
  chip: {
    paddingHorizontal: 14, height: 34, borderRadius: 14,
    backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center',
    ...SHADOW,
  },
  chipActive:   { backgroundColor: COLORS.black },
  chipTxt:      { fontFamily: FONT, fontSize: 12, fontWeight: '700', color: COLORS.grey },
  chipTxtActive:{ color: '#FFF' },

  // Section header
  sectionHeader: {
    fontFamily: FONT, fontSize: 11, fontWeight: '700', letterSpacing: 1.5,
    color: COLORS.grey, marginHorizontal: SPACE.lg, marginTop: 16, marginBottom: 8,
    textTransform: 'uppercase',
  },

  // Tx card
  txCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFF', marginHorizontal: SPACE.lg, marginBottom: 8,
    borderRadius: RADIUS, padding: 14, gap: 12, ...SHADOW,
  },
  txIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  txBody: { flex: 1 },
  txDesc: { fontFamily: FONT, fontSize: 13, fontWeight: '700', color: COLORS.black, marginBottom: 4 },
  txMetaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginBottom: 5 },
  txDate: { fontFamily: FONT, fontSize: 11, color: COLORS.grey },
  txMid:  { fontFamily: FONT, fontSize: 11, color: COLORS.grey, marginLeft: 4, fontWeight: '600' },
  syncPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row', alignItems: 'center', gap: 3,
    borderRadius: 8, paddingVertical: 2, paddingHorizontal: 6,
  },
  syncLabel: { fontFamily: FONT, fontSize: 9, fontWeight: '700', letterSpacing: 0.2 },
  txAmount:  { fontFamily: FONT, fontSize: 14, fontWeight: '800', letterSpacing: -0.5 },
  txCur:     { fontSize: 10, fontWeight: '600', color: COLORS.grey },

  // Empty
  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: SPACE.xl },
  emptyIcon: {
    width: 72, height: 72, borderRadius: 24, backgroundColor: '#FFF',
    alignItems: 'center', justifyContent: 'center', marginBottom: 20, ...SHADOW,
  },
  emptyTitle: { fontFamily: FONT, fontSize: 16, fontWeight: '800', color: COLORS.black, marginBottom: 6 },
  emptyBody:  { fontFamily: FONT, fontSize: 13, color: COLORS.grey, textAlign: 'center', lineHeight: 20 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
