import { useEffect, useState } from 'react';
import {
  View, Text, Modal, TouchableOpacity, StyleSheet, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  X, ArrowDownLeft, ArrowUpRight, ArrowRightLeft, TrendingUp,
  Clock, CheckCircle2, Hash, Calendar, FileText, User, Tag, ChevronDown,
} from 'lucide-react-native';
import { setTransactionCategory } from '../database';
import { CATEGORIES, getCategory, guessCategory } from '../data/financeCategories';
import { categoryIcon } from '../screens/finance/categoryIcons';
import { COLORS, FONT, SPACE, TX_TYPE, TX_STATUS, SYNC_DISPLAY } from '../theme';

// ── Helpers ────────────────────────────────────────────────────────────────

function meta(type) {
  switch (type) {
    case TX_TYPE.COLLECT:  return { Icon: ArrowDownLeft,  color: COLORS.success, bg: COLORS.successSoft, label: 'Reliquat reçu',      verb: 'Reçu de',     sign: '+' };
    case TX_TYPE.TRANSFER: return { Icon: ArrowUpRight,   color: COLORS.gold,    bg: COLORS.goldSoft,    label: 'Envoi de reliquat',  verb: 'Envoyé à',    sign: '−' };
    case TX_TYPE.TOPUP:    return { Icon: TrendingUp,     color: COLORS.gold,    bg: COLORS.goldSoft,    label: 'Recharge du compte', verb: 'Rechargé via', sign: '+' };
    case TX_TYPE.WITHDRAW: return { Icon: ArrowRightLeft, color: COLORS.error,   bg: COLORS.errorSoft,   label: 'Retrait du compte',  verb: 'Retiré vers', sign: '−' };
    default:               return { Icon: FileText,       color: COLORS.grey,    bg: COLORS.greySoft,    label: type,                  verb: 'Détail',      sign: '' };
  }
}

function formatDateTime(iso) {
  const d = new Date(iso);
  return d.toLocaleString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ── Row ────────────────────────────────────────────────────────────────────

function DetailRow({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <View style={s.row}>
      <View style={s.rowIcon}>
        <Icon size={14} color={COLORS.grey} strokeWidth={2.2} />
      </View>
      <View style={s.rowBody}>
        <Text style={s.rowLabel}>{label}</Text>
        <Text style={s.rowValue} numberOfLines={2}>{value}</Text>
      </View>
    </View>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────

export default function TransactionDetailModal({ visible, transaction, onClose, onCategoryChange }) {
  const insets = useSafeAreaInsets();
  const [currentCat, setCurrentCat] = useState(null);
  const [picking,    setPicking]    = useState(false);

  useEffect(() => {
    if (transaction) {
      setCurrentCat(transaction.category || guessCategory(transaction.description, transaction.type));
    }
    setPicking(false);
  }, [transaction]);

  if (!transaction) return null;

  const chooseCat = async (catId) => {
    setCurrentCat(catId);
    setPicking(false);
    try {
      await setTransactionCategory(transaction.tx_id, catId);
      onCategoryChange?.(catId);
    } catch { /* silencieux : la catégorie reste locale */ }
  };

  const cat = getCategory(currentCat);
  const CatIcon = categoryIcon(cat.icon);
  const m       = meta(transaction.type);
  const sync    = SYNC_DISPLAY[transaction.status] ?? { label: transaction.status, color: COLORS.grey, bg: COLORS.greySoft };
  const SyncIcon = transaction.status === TX_STATUS.PENDING_SYNC ? Clock : CheckCircle2;
  const isInflow = m.sign === '+';
  const grad     = isInflow ? ['#1A7F4B', '#22A55B'] : ['#D69E4E', '#B5822D'];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.backdrop}>
        <View style={[s.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={s.handle} />

          {/* Header */}
          <View style={s.header}>
            <Text style={s.title}>Détail de la transaction</Text>
            <TouchableOpacity onPress={onClose} hitSlop={10} style={s.closeBtn}>
              <X size={20} color={COLORS.grey} strokeWidth={2.2} />
            </TouchableOpacity>
          </View>

          {/* Amount card */}
          <LinearGradient
            colors={grad}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.amtCard}
          >
            <View style={s.amtIconWrap}>
              <m.Icon size={22} color="#FFF" strokeWidth={2.2} />
            </View>
            <Text style={s.amtLabel}>{m.label}</Text>
            <View style={s.amtRow}>
              <Text style={s.amtValue}>
                {m.sign}{transaction.amount?.toLocaleString('fr-FR')}
              </Text>
              <Text style={s.amtCur}>F CFA</Text>
            </View>

            {/* Sync badge */}
            <View style={[s.syncBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <SyncIcon size={10} color="#FFF" strokeWidth={2.5} />
              <Text style={s.syncTxt}>{sync.label}</Text>
            </View>
          </LinearGradient>

          {/* Details */}
          <View style={s.details}>
            <DetailRow icon={FileText} label="Description"    value={transaction.description} />
            <DetailRow icon={User}     label={m.verb}         value={transaction.counterparty_id} />
            <DetailRow icon={Calendar} label="Date et heure"  value={formatDateTime(transaction.created_at)} />
            <DetailRow icon={Hash}     label="Référence"      value={transaction.tx_id?.slice(0, 8).toUpperCase() + '…'} />

            {/* Catégorie (éditable) */}
            <TouchableOpacity style={s.row} onPress={() => setPicking((p) => !p)} activeOpacity={0.7}>
              <View style={s.rowIcon}>
                <Tag size={14} color={COLORS.grey} strokeWidth={2.2} />
              </View>
              <View style={s.rowBody}>
                <Text style={s.rowLabel}>Catégorie</Text>
                <View style={s.catCurrent}>
                  <View style={[s.catDot, { backgroundColor: cat.bg }]}>
                    <CatIcon size={12} color={cat.color} strokeWidth={2.4} />
                  </View>
                  <Text style={s.rowValue}>{cat.label}</Text>
                </View>
              </View>
              <ChevronDown size={16} color={COLORS.grey} strokeWidth={2.2} />
            </TouchableOpacity>

            {picking && (
              <View style={s.catPicker}>
                {CATEGORIES.map((c) => {
                  const Icon = categoryIcon(c.icon);
                  const on = currentCat === c.id;
                  return (
                    <TouchableOpacity
                      key={c.id}
                      style={[s.catChip, on && { borderColor: c.color, backgroundColor: c.bg }]}
                      onPress={() => chooseCat(c.id)}
                      activeOpacity={0.8}
                    >
                      <Icon size={14} color={on ? c.color : COLORS.grey} strokeWidth={2.2} />
                      <Text style={[s.catChipTxt, on && { color: c.color }]}>{c.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>

          <TouchableOpacity onPress={onClose} style={s.doneBtn} activeOpacity={0.85}>
            <Text style={s.doneBtnTxt}>Fermer</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const RADIUS = 20;
const SHADOW = Platform.select({
  ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 12 },
  default: { elevation: 3 },
});

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: COLORS.bg,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingTop: 12, paddingHorizontal: SPACE.lg,
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: '#E0E0E0', marginBottom: 16 },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  title:  { fontFamily: FONT, fontSize: 17, fontWeight: '800', color: COLORS.black, letterSpacing: -0.3 },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: '#FFF',
    alignItems: 'center', justifyContent: 'center',
  },

  // Amount card
  amtCard:    { borderRadius: RADIUS, padding: 20, marginBottom: 20, alignItems: 'flex-start', ...SHADOW },
  amtIconWrap:{
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  amtLabel:  { fontFamily: FONT, fontSize: 11, fontWeight: '700', letterSpacing: 1.5, color: 'rgba(255,255,255,0.85)', marginBottom: 6 },
  amtRow:    { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 14 },
  amtValue:  { fontFamily: FONT, fontSize: 32, fontWeight: '800', color: '#FFF', letterSpacing: -1.5 },
  amtCur:    { fontFamily: FONT, fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.85)' },

  syncBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingVertical: 4, paddingHorizontal: 10, borderRadius: 12,
  },
  syncTxt:   { fontFamily: FONT, fontSize: 10, fontWeight: '700', color: '#FFF', letterSpacing: 0.3 },

  // Details list
  details:   { backgroundColor: '#FFF', borderRadius: RADIUS, paddingVertical: 8, marginBottom: 16, ...SHADOW },
  row:       { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 16, paddingVertical: 10 },
  rowIcon:   { width: 28, height: 28, borderRadius: 8, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  rowBody:   { flex: 1 },
  rowLabel:  { fontFamily: FONT, fontSize: 10, fontWeight: '700', letterSpacing: 1, color: COLORS.grey, marginBottom: 4 },
  rowValue:  { fontFamily: FONT, fontSize: 13, color: COLORS.black, fontWeight: '600' },

  catCurrent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  catDot:     { width: 22, height: 22, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  catPicker:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingBottom: 14, paddingTop: 2 },
  catChip:    { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.bg, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1.5, borderColor: '#EEEEEE' },
  catChipTxt: { fontFamily: FONT, fontSize: 11, fontWeight: '700', color: COLORS.grey },

  // Done button
  doneBtn:   {
    backgroundColor: COLORS.black, borderRadius: 14, paddingVertical: 14,
    alignItems: 'center', ...SHADOW,
  },
  doneBtnTxt:{ fontFamily: FONT, fontSize: 14, fontWeight: '700', color: '#FFF', letterSpacing: 0.3 },
});
