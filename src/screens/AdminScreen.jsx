import { useState, useCallback, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, FlatList,
  StyleSheet, Platform, ActivityIndicator, Alert,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft, ShieldCheck, CheckCircle2, XCircle, Clock,
  TrendingUp, Banknote, Smartphone, CreditCard, RefreshCw,
  Image as ImageIcon, ChevronRight,
} from 'lucide-react-native';
import { supabase } from '../services/supabase';
import { generateUUID } from '../database';
import { COLORS, FONT, SPACE } from '../theme';

// ── Helpers ────────────────────────────────────────────────────────────────

function formatAmount(n) {
  return n?.toLocaleString('fr-FR') ?? '—';
}

function formatDateTime(iso) {
  const d = new Date(iso);
  return d.toLocaleString('fr-FR', {
    day: '2-digit', month: 'short',
    hour: '2-digit', minute: '2-digit',
  });
}

function providerLogo(p) {
  switch (p) {
    case 'internal':     return { short: 'INT',  bg: COLORS.gold, tint: COLORS.goldSoft };
    case 'orange_money': return { short: 'OM',   bg: '#FF7900', tint: '#FFE4CC' };
    case 'wave':         return { short: 'WAVE', bg: '#1DCFFB', tint: '#CFF5FE' };
    case 'moov_money':   return { short: 'MM',   bg: '#0066B3', tint: '#CCE0F0' };
    case 'card':         return { short: 'CB',   bg: '#1A1A1A', tint: '#E5E5E5' };
    default:             return { short: '?',    bg: COLORS.grey, tint: COLORS.greySoft };
  }
}

function providerLabel(p) {
  return {
    internal:     'Recharge interne',
    orange_money: 'Orange Money',
    wave:         'Wave',
    moov_money:   'Moov Money',
    card:         'Carte',
  }[p] ?? p;
}

const STATUS_DISPLAY = {
  PENDING:   { label: 'En attente', color: COLORS.gold,    bg: COLORS.goldSoft,    Icon: Clock },
  CONFIRMED: { label: 'Validée',    color: COLORS.success, bg: COLORS.successSoft, Icon: CheckCircle2 },
  REJECTED:  { label: 'Rejetée',    color: COLORS.error,   bg: COLORS.errorSoft,   Icon: XCircle },
};

// ── Request card ──────────────────────────────────────────────────────────

function RequestCard({ item, onApprove, onReject, busy }) {
  const logo = providerLogo(item.provider);
  const status = STATUS_DISPLAY[item.status] ?? STATUS_DISPLAY.PENDING;
  const isTopUp   = item.type === 'TOPUP';
  const ActionIcon = isTopUp ? TrendingUp : Banknote;

  return (
    <View style={s.card}>
      <View style={s.cardHeader}>
        <View style={[s.cardIcon, { backgroundColor: isTopUp ? COLORS.goldSoft : COLORS.errorSoft }]}>
          <ActionIcon size={18} color={isTopUp ? COLORS.gold : COLORS.error} strokeWidth={2.2} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.cardTitle}>
            {isTopUp ? 'Recharge' : 'Retrait'} · {formatAmount(item.amount)} F
          </Text>
          <View style={s.cardSubRow}>
            <Text style={s.cardSub}>{formatDateTime(item.created_at)}</Text>
            <Text style={s.cardRef}>#{String(item.id).slice(0, 8)}</Text>
          </View>
        </View>
        <View style={[s.statusBadge, { backgroundColor: status.bg }]}>
          <status.Icon size={10} color={status.color} strokeWidth={2.5} />
          <Text style={[s.statusLabel, { color: status.color }]}>{status.label}</Text>
        </View>
      </View>

      <View style={s.cardDetails}>
        {/* Méthode + opérateur */}
        <View style={s.detailRow}>
          <View style={[s.provLogo, { backgroundColor: logo.tint }]}>
            <Text style={[s.provShort, { color: logo.bg }]}>{logo.short}</Text>
          </View>
          <Text style={s.detailValue}>
            {providerLabel(item.provider)}
            {item.phone_number ? ` · ${item.phone_number}` : ''}
          </Text>
        </View>

        {/* Client : nom + email + tel + pays */}
        {item.user_info ? (
          <>
            <View style={s.detailDivider} />
            <View style={s.clientBlock}>
              <Text style={s.clientLabel}>CLIENT</Text>
              {item.user_info.full_name && (
                <Text style={s.clientName}>{item.user_info.full_name}</Text>
              )}
              <Text style={s.clientEmail}>{item.user_info.email}</Text>
              {item.user_info.phone_number && (
                <Text style={s.clientMeta}>📞 {item.user_info.phone_number}</Text>
              )}
              {item.user_info.country && (
                <Text style={s.clientMeta}>🌍 {item.user_info.country}</Text>
              )}
            </View>
          </>
        ) : (
          <View style={s.detailRow}>
            <Text style={s.detailLabel}>CLIENT</Text>
            <Text style={s.detailValue} numberOfLines={1}>
              {item.user_id?.slice(0, 8) + '…'}
            </Text>
          </View>
        )}
      </View>

      {item.status === 'PENDING' && (
        <View style={s.actionRow}>
          <TouchableOpacity
            style={[s.btn, s.btnReject]}
            onPress={() => onReject(item)}
            activeOpacity={0.85}
            disabled={busy}
          >
            <XCircle size={15} color={COLORS.error} strokeWidth={2.3} />
            <Text style={s.btnRejectTxt}>Rejeter</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.btn, s.btnApprove]}
            onPress={() => onApprove(item)}
            activeOpacity={0.85}
            disabled={busy}
          >
            {busy
              ? <ActivityIndicator color="#FFF" size="small" />
              : <>
                  <CheckCircle2 size={15} color="#FFF" strokeWidth={2.3} />
                  <Text style={s.btnApproveTxt}>Valider</Text>
                </>}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────

export default function AdminScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  const [requests,   setRequests]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId,     setBusyId]     = useState(null);
  const [filter,     setFilter]     = useState('PENDING'); // PENDING / CONFIRMED / REJECTED / ALL

  const loadRequests = useCallback(async () => {
    try {
      // Fetch all payment_requests
      let query = supabase
        .from('payment_requests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (filter !== 'ALL') query = query.eq('status', filter);

      const { data, error } = await query;
      if (error) throw new Error(error.message);

      // Enrich each row with user info via the SECURITY DEFINER function
      const enriched = await Promise.all(
        (data ?? []).map(async (r) => {
          try {
            const { data: info } = await supabase.rpc('get_user_info', { uid: r.user_id });
            return { ...r, user_info: info };
          } catch {
            return { ...r, user_info: null };
          }
        }),
      );
      setRequests(enriched);
    } catch (e) {
      Alert.alert('Erreur', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useEffect(() => { loadRequests(); }, [loadRequests]);

  const handleApprove = async (req) => {
    setBusyId(req.id);
    try {
      // 1. Generate UUID for the new transaction
      const txId = await generateUUID();

      // 2. Insert transaction (the trigger updates the wallet balance)
      const { error: txError } = await supabase
        .from('transactions')
        .insert({
          tx_id:       txId,
          user_id:     req.user_id,
          type:        req.type,             // TOPUP or WITHDRAW
          amount:      req.amount,
          status:      'VALIDATED',
          description: `${req.type === 'TOPUP' ? 'Recharge' : 'Retrait'} ${req.provider} validé par admin`,
        });
      if (txError) throw new Error(`Erreur insertion transaction : ${txError.message}`);

      // 3. Mark request as CONFIRMED
      const { error: prError } = await supabase
        .from('payment_requests')
        .update({ status: 'CONFIRMED' })
        .eq('id', req.id);
      if (prError) throw new Error(`Erreur mise à jour demande : ${prError.message}`);

      // 4. Reload list
      await loadRequests();
      Alert.alert('Validée', `Recharge de ${formatAmount(req.amount)} F validée.`);
    } catch (e) {
      Alert.alert('Erreur', e.message);
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (req) => {
    Alert.alert(
      'Rejeter cette demande ?',
      `Recharge de ${formatAmount(req.amount)} F via ${req.provider}.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Rejeter',
          style: 'destructive',
          onPress: async () => {
            setBusyId(req.id);
            try {
              const { error } = await supabase
                .from('payment_requests')
                .update({ status: 'REJECTED' })
                .eq('id', req.id);
              if (error) throw new Error(error.message);
              await loadRequests();
            } catch (e) {
              Alert.alert('Erreur', e.message);
            } finally {
              setBusyId(null);
            }
          },
        },
      ],
    );
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadRequests();
  }, [loadRequests]);

  const pendingCount = requests.filter((r) => r.status === 'PENDING').length;

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.headerBar}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <ArrowLeft size={20} color={COLORS.black} strokeWidth={2.2} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Console admin</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Hero card */}
      <LinearGradient
        colors={['#D69E4E', '#B5822D']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.hero}
      >
        <View style={s.heroIcon}>
          <ShieldCheck size={22} color="#FFF" strokeWidth={2.2} />
        </View>
        <Text style={s.heroOver}>VALIDATION DES DEMANDES</Text>
        <Text style={s.heroTitle}>
          {pendingCount} {pendingCount > 1 ? 'demandes en attente' : 'demande en attente'}
        </Text>
        <Text style={s.heroSub}>
          Valide les recharges Mobile Money en attendant l'intégration Moneroo.
        </Text>
      </LinearGradient>

      {/* Outils admin */}
      <TouchableOpacity
        style={s.toolRow}
        onPress={() => navigation.navigate('AdminAds')}
        activeOpacity={0.85}
      >
        <View style={s.toolIcon}>
          <ImageIcon size={18} color={COLORS.gold} strokeWidth={2.2} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.toolTitle}>Gérer les bannières</Text>
          <Text style={s.toolSub}>Publicités affichées sur l'écran d'accueil</Text>
        </View>
        <ChevronRight size={18} color={COLORS.greyLight} strokeWidth={2.2} />
      </TouchableOpacity>

      {/* Filter */}
      <View style={s.filterRow}>
        {[
          { key: 'PENDING',   label: 'En attente' },
          { key: 'CONFIRMED', label: 'Validées' },
          { key: 'REJECTED',  label: 'Rejetées' },
          { key: 'ALL',       label: 'Tout' },
        ].map((f) => {
          const on = filter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              style={[s.chip, on && s.chipActive]}
              onPress={() => setFilter(f.key)}
              activeOpacity={0.85}
            >
              <Text style={[s.chipTxt, on && s.chipTxtActive]}>{f.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* List */}
      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color={COLORS.gold} size="large" />
        </View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <RequestCard
              item={item}
              onApprove={handleApprove}
              onReject={handleReject}
              busy={busyId === item.id}
            />
          )}
          contentContainerStyle={{ paddingBottom: insets.bottom + 32, paddingTop: 4 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.gold} colors={[COLORS.gold]} />
          }
          ListEmptyComponent={
            <View style={s.empty}>
              <RefreshCw size={32} color={COLORS.greyLight} strokeWidth={1.8} />
              <Text style={s.emptyTitle}>Aucune demande</Text>
              <Text style={s.emptyBody}>
                Les demandes de recharge apparaîtront ici dès qu'un utilisateur en initiera une.
              </Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const RADIUS = 18;
const SHADOW = Platform.select({
  ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 10 },
  default: { elevation: 2 },
});

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },

  headerBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACE.md, paddingVertical: 10,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: '#FFF',
    alignItems: 'center', justifyContent: 'center', ...SHADOW,
  },
  headerTitle: { fontFamily: FONT, fontSize: 16, fontWeight: '800', color: COLORS.black },

  // Hero
  hero: {
    marginHorizontal: SPACE.lg, marginTop: 8, marginBottom: 16,
    borderRadius: RADIUS, padding: 20, ...SHADOW,
  },
  heroIcon: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  heroOver:  { fontFamily: FONT, fontSize: 10, fontWeight: '700', letterSpacing: 1.5, color: 'rgba(255,255,255,0.85)', marginBottom: 4 },
  heroTitle: { fontFamily: FONT, fontSize: 22, fontWeight: '800', color: '#FFF', letterSpacing: -0.5, marginBottom: 6 },
  heroSub:   { fontFamily: FONT, fontSize: 12, color: 'rgba(255,255,255,0.8)', lineHeight: 17 },

  // Tool row (Gérer bannières, etc.)
  toolRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FFF', marginHorizontal: SPACE.lg, marginBottom: 14,
    borderRadius: 14, padding: 14, ...SHADOW,
  },
  toolIcon: {
    width: 38, height: 38, borderRadius: 11,
    backgroundColor: COLORS.goldSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  toolTitle: { fontFamily: FONT, fontSize: 13, fontWeight: '800', color: COLORS.black, letterSpacing: -0.2 },
  toolSub:   { fontFamily: FONT, fontSize: 11, color: COLORS.grey, marginTop: 2 },

  // Filter
  filterRow:  { flexDirection: 'row', gap: 8, paddingHorizontal: SPACE.lg, marginBottom: 12 },
  chip: {
    paddingHorizontal: 14, height: 32, borderRadius: 14,
    backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', ...SHADOW,
  },
  chipActive:    { backgroundColor: COLORS.black },
  chipTxt:       { fontFamily: FONT, fontSize: 12, fontWeight: '700', color: COLORS.grey },
  chipTxtActive: { color: '#FFF' },

  // Card
  card: {
    backgroundColor: '#FFF', marginHorizontal: SPACE.lg, marginBottom: 10,
    borderRadius: RADIUS, padding: 14, ...SHADOW,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  cardIcon:   { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardTitle:  { fontFamily: FONT, fontSize: 14, fontWeight: '800', color: COLORS.black, letterSpacing: -0.3 },
  cardSubRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  cardSub:    { fontFamily: FONT, fontSize: 11, color: COLORS.grey },
  cardRef:    { fontFamily: FONT, fontSize: 10, fontWeight: '800', color: COLORS.gold, letterSpacing: 0.5, backgroundColor: COLORS.goldSoft, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },

  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10,
  },
  statusLabel: { fontFamily: FONT, fontSize: 9, fontWeight: '700', letterSpacing: 0.3 },

  cardDetails:    { gap: 8, marginBottom: 12, backgroundColor: COLORS.bg, padding: 12, borderRadius: 10 },
  detailRow:      { flexDirection: 'row', alignItems: 'center', gap: 10 },
  detailLabel:    { fontFamily: FONT, fontSize: 10, fontWeight: '700', letterSpacing: 1, color: COLORS.grey, width: 90 },
  detailValue:    { flex: 1, fontFamily: FONT, fontSize: 12, color: COLORS.black, fontWeight: '600' },
  detailDivider:  { height: 1, backgroundColor: '#EEE', marginVertical: 4 },
  provLogo:       { width: 22, height: 22, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  provShort:      { fontFamily: FONT, fontSize: 8, fontWeight: '800', letterSpacing: 0.3 },

  clientBlock: { gap: 2 },
  clientLabel: { fontFamily: FONT, fontSize: 9, fontWeight: '700', letterSpacing: 1.5, color: COLORS.grey, marginBottom: 4 },
  clientName:  { fontFamily: FONT, fontSize: 13, fontWeight: '800', color: COLORS.black, letterSpacing: -0.2 },
  clientEmail: { fontFamily: FONT, fontSize: 12, color: COLORS.gold, fontWeight: '600' },
  clientMeta:  { fontFamily: FONT, fontSize: 11, color: COLORS.grey, fontWeight: '500', marginTop: 2 },

  // Actions
  actionRow: { flexDirection: 'row', gap: 8 },
  btn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10, borderRadius: 12,
  },
  btnReject:     { backgroundColor: COLORS.errorSoft },
  btnRejectTxt:  { fontFamily: FONT, fontSize: 12, fontWeight: '700', color: COLORS.error },
  btnApprove:    { backgroundColor: COLORS.success },
  btnApproveTxt: { fontFamily: FONT, fontSize: 12, fontWeight: '700', color: '#FFF' },

  // Empty
  center:     { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty:      { alignItems: 'center', paddingTop: 48, paddingHorizontal: 32 },
  emptyTitle: { fontFamily: FONT, fontSize: 15, fontWeight: '800', color: COLORS.black, marginTop: 12, marginBottom: 6 },
  emptyBody:  { fontFamily: FONT, fontSize: 12, color: COLORS.grey, textAlign: 'center', lineHeight: 17 },
});
