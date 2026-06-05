import { useCallback, useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, StatusBar, Platform, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowUpRight, Banknote, History,
  CheckCircle2, ArrowDownLeft,
  User, RefreshCw,
} from 'lucide-react-native';
import { syncPendingTransactions, pullFromServer } from '../services/syncService';
import useAppStore from '../store/useAppStore';
import AdBanner from '../components/AdBanner';
import { COLORS, FONT, SPACE } from '../theme';

// ── Helpers ────────────────────────────────────────────────────────────────

function formatAmount(n) {
  return n?.toLocaleString('fr-FR') ?? '—';
}

function _friendlySyncError(err) {
  if (!err) return '';
  if (err === 'no_session') return 'reconnecte-toi';
  if (err === 'offline')    return 'hors-ligne';
  if (err === 'web')        return 'indispo sur web';
  if (err.includes('Unable to resolve host') || err.includes('Network request failed'))
                            return 'serveur injoignable';
  if (err.includes('row-level security') || err.includes('violates row-level'))
                            return 'permission Supabase refusée';
  if (err.includes('JWT'))  return 'session expirée';
  return err.slice(0, 60);
}

// ── Quick action card ──────────────────────────────────────────────────────

function ActionCard({ icon: Icon, label, color, bg, onPress }) {
  return (
    <TouchableOpacity style={s.actionCard} onPress={onPress} activeOpacity={0.75}>
      <View style={[s.actionIcon, { backgroundColor: bg }]}>
        <Icon size={22} color={color} strokeWidth={2} />
      </View>
      <Text style={s.actionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────

export default function HomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  const balance        = useAppStore((s) => s.balance);
  const pending        = useAppStore((s) => s.pendingCount);
  const refreshWallet  = useAppStore((s) => s.refreshWallet);
  const lastSyncResult = useAppStore((s) => s.lastSyncResult);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(useCallback(() => { refreshWallet(); }, [refreshWallet]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const result = await syncPendingTransactions();
      useAppStore.getState().setLastSyncResult(result);
      await pullFromServer().catch(() => {});
      await refreshWallet();
    } finally {
      setRefreshing(false);
    }
  }, [refreshWallet]);

  const ACTIONS = [
    { key: 'receive',  icon: ArrowDownLeft, label: 'Recevoir',  color: COLORS.success, bg: COLORS.successSoft, onPress: () => navigation.navigate('Scan')     },
    { key: 'send',     icon: ArrowUpRight,  label: 'Envoyer',   color: COLORS.gold,    bg: COLORS.goldSoft,    onPress: () => navigation.navigate('Merchant') },
    { key: 'withdraw', icon: Banknote,      label: 'Retrait',   color: COLORS.black,   bg: '#EBEBEB',          onPress: () => navigation.navigate('Transfer', { type: 'withdraw' }) },
    { key: 'history',  icon: History,       label: 'Historique',color: '#7C3AED',      bg: '#EDE9FE',          onPress: () => navigation.navigate('History')  },
  ];

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />

      {/* ── Header ── */}
      <View style={s.header}>
        <View>
          <Text style={s.greeting}>Bonjour 👋</Text>
          <Text style={s.wordmark}>
            <Text style={s.wGold}>Lika</Text>
            <Text style={s.wBlack}>Pocket</Text>
          </Text>
        </View>
        <TouchableOpacity style={s.avatar} onPress={() => navigation.navigate('Profile')} activeOpacity={0.7}>
          <User size={18} color={COLORS.gold} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.gold} colors={[COLORS.gold]} />
        }
      >
        {/* ── Balance card ── */}
        <View style={s.cardWrap}>
          <LinearGradient
            colors={['#D69E4E', '#B5822D']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.balanceCard}
          >
            <View style={s.balanceTop}>
              <Text style={s.balanceOverline}>SOLDE DISPONIBLE</Text>
              <View style={s.syncRow}>
                {pending > 0
                  ? <><RefreshCw size={10} color="rgba(255,255,255,0.7)" strokeWidth={2.5} /><Text style={s.syncHint}>{pending} en attente</Text></>
                  : <><CheckCircle2 size={10} color="rgba(255,255,255,0.7)" strokeWidth={2.5} /><Text style={s.syncHint}>Synchronisé</Text></>}
              </View>
            </View>

            <Text style={s.balanceAmt} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
              {formatAmount(balance)}
            </Text>
            <Text style={s.balanceCur}>Francs CFA</Text>

            {lastSyncResult?.error && lastSyncResult.error !== 'offline' && pending > 0 && (
              <View style={s.syncErrorPill}>
                <Text style={s.syncErrorTxt} numberOfLines={2}>
                  ⚠ Sync : {_friendlySyncError(lastSyncResult.error)}
                </Text>
              </View>
            )}
          </LinearGradient>
        </View>

        {/* ── Quick actions 2×2 ── */}
        <View style={s.actionsGrid}>
          {ACTIONS.map((a) => (
            <ActionCard key={a.key} icon={a.icon} label={a.label} color={a.color} bg={a.bg} onPress={a.onPress} />
          ))}
        </View>

        {/* ── Ad banner (publicité, masqué si aucune ad active) ── */}
        <AdBanner />
      </ScrollView>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const RADIUS = 20;
const SHADOW = Platform.select({
  ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 12 },
  default: { elevation: 3 },
});

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#F9F9F9' },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACE.lg, paddingVertical: 14,
    backgroundColor: '#F9F9F9',
  },
  greeting:  { fontFamily: FONT, fontSize: 12, color: COLORS.grey, fontWeight: '500' },
  wordmark:  { fontFamily: FONT, fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
  wGold:     { color: COLORS.gold },
  wBlack:    { color: COLORS.black },
  avatar:    { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.goldSoft, alignItems: 'center', justifyContent: 'center' },

  // Balance card
  cardWrap:    { paddingHorizontal: SPACE.lg, paddingTop: 8, paddingBottom: 4 },
  balanceCard: { borderRadius: RADIUS, padding: 24, ...SHADOW },
  balanceTop:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  balanceOverline: { fontFamily: FONT, fontSize: 10, fontWeight: '700', letterSpacing: 2, color: 'rgba(255,255,255,0.75)' },
  syncRow:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  syncHint:    { fontFamily: FONT, fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },
  balanceAmt:  { fontFamily: FONT, fontSize: 52, fontWeight: '800', color: '#FFF', letterSpacing: -2, lineHeight: 58 },
  balanceCur:  { fontFamily: FONT, fontSize: 13, color: 'rgba(255,255,255,0.75)', fontWeight: '600', marginTop: 4 },

  syncErrorPill: {
    marginTop: 12, alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.25)',
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10,
  },
  syncErrorTxt:  { fontFamily: FONT, fontSize: 10, color: '#FFF', fontWeight: '600' },

  // Quick actions
  actionsGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: SPACE.lg, paddingTop: 20, gap: 12,
  },
  actionCard: {
    width: '47%', backgroundColor: '#FFF', borderRadius: RADIUS,
    padding: 16, alignItems: 'center', ...SHADOW,
  },
  actionIcon:  { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  actionLabel: { fontFamily: FONT, fontSize: 13, fontWeight: '700', color: COLORS.black, textAlign: 'center' },
});
