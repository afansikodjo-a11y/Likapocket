import { useCallback, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, Modal,
  StyleSheet, Platform, ActivityIndicator, Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { ChevronLeft, Check, X, Trash2 } from 'lucide-react-native';
import {
  getMonthlySummary, listBudgets, setBudget, deleteBudget, currentMonth,
} from '../../database';
import { CATEGORIES, SAVINGS_CATEGORY_ID, getCategory } from '../../data/financeCategories';
import { categoryIcon } from './categoryIcons';
import { COLORS, FONT, SPACE } from '../../theme';

const PICKABLE = CATEGORIES.filter((c) => c.id !== SAVINGS_CATEGORY_ID && c.id !== 'revenus');
const fmt = (n) => (n ?? 0).toLocaleString('fr-FR');

export default function BudgetsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [spentMap, setSpentMap] = useState({});
  const [limitMap, setLimitMap] = useState({});
  const [editing,  setEditing]  = useState(null); // category id
  const [draft,    setDraft]    = useState('');
  const [saving,   setSaving]   = useState(false);

  const load = useCallback(async () => {
    const month = currentMonth();
    const [sum, budgets] = await Promise.all([getMonthlySummary(month), listBudgets()]);
    setSpentMap(Object.fromEntries(sum.byCategory.map((b) => [b.category, b.amount])));
    setLimitMap(Object.fromEntries(budgets.map((b) => [b.category, b.monthly_limit])));
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const openEdit = (catId) => {
    setEditing(catId);
    setDraft(limitMap[catId] ? String(limitMap[catId]) : '');
  };

  const handleSave = async () => {
    Keyboard.dismiss();
    const limit = Math.round(parseFloat(draft.replace(',', '.')));
    if (!isFinite(limit) || limit <= 0) return;
    setSaving(true);
    try {
      await setBudget(editing, limit);
      await load();
      setEditing(null);
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      await deleteBudget(editing);
      await load();
      setEditing(null);
    } finally { setSaving(false); }
  };

  const editCat = editing ? getCategory(editing) : null;

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10} style={s.backBtn}>
          <ChevronLeft size={22} color={COLORS.black} strokeWidth={2.2} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Budgets du mois</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: SPACE.lg, paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={s.intro}>
          Fixe un plafond mensuel par catégorie. Tu seras alerté à l'approche et au dépassement.
        </Text>

        {PICKABLE.map((c) => {
          const Icon = categoryIcon(c.icon);
          const limit = limitMap[c.id];
          const spent = spentMap[c.id] ?? 0;
          const ratio = limit ? Math.min(spent / limit, 1) : 0;
          const over = limit && spent >= limit;
          const warn = limit && spent >= limit * 0.8 && !over;
          const barColor = over ? COLORS.error : warn ? COLORS.warning : COLORS.success;
          return (
            <TouchableOpacity key={c.id} style={s.row} onPress={() => openEdit(c.id)} activeOpacity={0.8}>
              <View style={[s.catIcon, { backgroundColor: c.bg }]}>
                <Icon size={18} color={c.color} strokeWidth={2.2} />
              </View>
              <View style={s.rowBody}>
                <View style={s.rowTop}>
                  <Text style={s.catLabel}>{c.label}</Text>
                  {limit
                    ? <Text style={[s.rowAmount, { color: barColor }]}>{fmt(spent)} / {fmt(limit)} F</Text>
                    : <Text style={s.rowSet}>Définir</Text>}
                </View>
                {limit ? (
                  <View style={s.barTrack}>
                    <View style={[s.barFill, { width: `${ratio * 100}%`, backgroundColor: barColor }]} />
                  </View>
                ) : null}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Modal édition plafond */}
      <Modal visible={!!editing} transparent animationType="fade" onRequestClose={() => setEditing(null)}>
        <View style={s.backdrop}>
          <View style={s.modalCard}>
            <TouchableOpacity style={s.modalClose} onPress={() => setEditing(null)} hitSlop={10}>
              <X size={18} color={COLORS.grey} strokeWidth={2.2} />
            </TouchableOpacity>
            <Text style={s.modalTitle}>Plafond — {editCat?.label}</Text>
            <View style={s.modalInputRow}>
              <TextInput
                style={s.modalInput}
                value={draft}
                onChangeText={setDraft}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#D9D9D9"
                autoFocus
                maxLength={10}
              />
              <Text style={s.modalCur}>F CFA</Text>
            </View>
            <TouchableOpacity style={[s.cta, saving && s.ctaDisabled]} onPress={handleSave} disabled={saving} activeOpacity={0.88}>
              {saving ? <ActivityIndicator color="#FFF" /> : <><Check size={17} color="#FFF" strokeWidth={2.4} /><Text style={s.ctaTxt}>Enregistrer</Text></>}
            </TouchableOpacity>
            {limitMap[editing] ? (
              <TouchableOpacity style={s.deleteBtn} onPress={handleDelete} disabled={saving} activeOpacity={0.7}>
                <Trash2 size={15} color={COLORS.error} strokeWidth={2.2} />
                <Text style={s.deleteTxt}>Supprimer ce budget</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const RADIUS = 20;
const SHADOW = Platform.select({
  ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 12 },
  default: { elevation: 3 },
});

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACE.lg, paddingVertical: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', ...SHADOW },
  headerTitle: { fontFamily: FONT, fontSize: 17, fontWeight: '800', color: COLORS.black, letterSpacing: -0.3 },

  intro: { fontFamily: FONT, fontSize: 12, color: COLORS.grey, lineHeight: 18, marginVertical: 12 },

  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFF', borderRadius: 16, padding: 14, marginBottom: 10, ...SHADOW },
  catIcon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  rowBody: { flex: 1 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  catLabel: { fontFamily: FONT, fontSize: 14, fontWeight: '700', color: COLORS.black },
  rowAmount: { fontFamily: FONT, fontSize: 12, fontWeight: '700' },
  rowSet: { fontFamily: FONT, fontSize: 12, fontWeight: '700', color: COLORS.gold },
  barTrack: { height: 6, borderRadius: 3, backgroundColor: '#EFEFEF', overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3 },

  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: SPACE.lg },
  modalCard: { width: '100%', maxWidth: 360, backgroundColor: COLORS.bg, borderRadius: 24, padding: 24, ...SHADOW },
  modalClose: { position: 'absolute', top: 14, right: 14, width: 32, height: 32, borderRadius: 16, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' },
  modalTitle: { fontFamily: FONT, fontSize: 16, fontWeight: '800', color: COLORS.black, marginBottom: 20, marginTop: 4 },
  modalInputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, borderBottomWidth: 2, borderBottomColor: COLORS.gold, paddingBottom: 8, marginBottom: 20 },
  modalInput: { flex: 1, fontFamily: FONT, fontSize: 34, fontWeight: '800', color: COLORS.black, letterSpacing: -1.5, padding: 0 },
  modalCur: { fontFamily: FONT, fontSize: 14, fontWeight: '600', color: COLORS.grey, marginBottom: 6 },
  cta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.black, borderRadius: 14, paddingVertical: 15 },
  ctaDisabled: { backgroundColor: '#BBBBBB' },
  ctaTxt: { fontFamily: FONT, fontSize: 15, fontWeight: '700', color: '#FFF' },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, marginTop: 4 },
  deleteTxt: { fontFamily: FONT, fontSize: 13, fontWeight: '700', color: COLORS.error },
});
