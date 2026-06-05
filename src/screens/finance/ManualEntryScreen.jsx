import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Platform, KeyboardAvoidingView, ActivityIndicator, Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Check, AlertCircle } from 'lucide-react-native';
import { addManualEntry } from '../../database';
import { CATEGORIES, SAVINGS_CATEGORY_ID } from '../../data/financeCategories';
import { categoryIcon } from './categoryIcons';
import { COLORS, FONT, SPACE } from '../../theme';

// Catégories proposées (l'épargne se gère via les coffres, pas en saisie manuelle)
const PICKABLE = CATEGORIES.filter((c) => c.id !== SAVINGS_CATEGORY_ID);

export default function ManualEntryScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const kind = route.params?.kind === 'INCOME' ? 'INCOME' : 'EXPENSE';
  const isIncome = kind === 'INCOME';

  const [amountText, setAmountText] = useState('');
  const [category,   setCategory]   = useState(isIncome ? 'revenus' : null);
  const [label,      setLabel]      = useState('');
  const [error,      setError]      = useState('');
  const [saving,     setSaving]     = useState(false);

  const handleSave = async () => {
    Keyboard.dismiss();
    setError('');
    const amount = Math.round(parseFloat(amountText.replace(',', '.')));
    if (!isFinite(amount) || amount <= 0) { setError('Entrez un montant valide supérieur à 0.'); return; }
    if (!category) { setError('Choisissez une catégorie.'); return; }
    setSaving(true);
    try {
      await addManualEntry({ kind, amount, category, label });
      navigation.goBack();
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  };

  const accent = isIncome ? COLORS.success : COLORS.error;

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10} style={s.backBtn}>
          <ChevronLeft size={22} color={COLORS.black} strokeWidth={2.2} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{isIncome ? 'Nouveau revenu' : 'Nouvelle dépense'}</Text>
        <View style={{ width: 36 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: SPACE.lg, paddingBottom: insets.bottom + 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Montant */}
          <View style={s.amtCard}>
            <Text style={s.fieldLabel}>MONTANT {isIncome ? 'REÇU' : 'DÉPENSÉ'} (ESPÈCES)</Text>
            <View style={s.amtRow}>
              <Text style={[s.amtSign, { color: accent }]}>{isIncome ? '+' : '−'}</Text>
              <TextInput
                style={s.amtInput}
                value={amountText}
                onChangeText={setAmountText}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#D9D9D9"
                maxLength={10}
                autoFocus
              />
              <Text style={s.amtCur}>F CFA</Text>
            </View>
          </View>

          {/* Catégorie */}
          <Text style={s.sectionLabel}>CATÉGORIE</Text>
          <View style={s.catGrid}>
            {PICKABLE.map((c) => {
              const Icon = categoryIcon(c.icon);
              const on = category === c.id;
              return (
                <TouchableOpacity
                  key={c.id}
                  style={[s.catChip, on && { borderColor: c.color, backgroundColor: c.bg }]}
                  onPress={() => setCategory(c.id)}
                  activeOpacity={0.8}
                >
                  <Icon size={16} color={on ? c.color : COLORS.grey} strokeWidth={2.2} />
                  <Text style={[s.catChipTxt, on && { color: c.color }]}>{c.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Libellé */}
          <Text style={s.sectionLabel}>LIBELLÉ (FACULTATIF)</Text>
          <View style={s.inputBox}>
            <TextInput
              style={s.input}
              value={label}
              onChangeText={setLabel}
              placeholder="Ex : courses au marché"
              placeholderTextColor="#C9C9C9"
              maxLength={60}
            />
          </View>

          {error ? (
            <View style={s.errorBox}>
              <AlertCircle size={14} color={COLORS.error} strokeWidth={2.2} />
              <Text style={s.errorTxt}>{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[s.cta, saving && s.ctaDisabled]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.88}
          >
            {saving
              ? <ActivityIndicator color="#FFF" />
              : <><Check size={18} color="#FFF" strokeWidth={2.4} /><Text style={s.ctaTxt}>Enregistrer</Text></>}
          </TouchableOpacity>

          <Text style={s.note}>
            Les saisies manuelles servent à ton suivi : elles n'affectent pas ton solde Lika.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
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

  amtCard: { backgroundColor: '#FFF', borderRadius: RADIUS, padding: 20, marginTop: 8, marginBottom: 20, ...SHADOW },
  fieldLabel: { fontFamily: FONT, fontSize: 10, fontWeight: '700', letterSpacing: 1.5, color: COLORS.grey, marginBottom: 12 },
  amtRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, borderBottomWidth: 2, borderBottomColor: COLORS.gold, paddingBottom: 8 },
  amtSign: { fontFamily: FONT, fontSize: 36, fontWeight: '800', marginBottom: 2 },
  amtInput: { flex: 1, fontFamily: FONT, fontSize: 40, fontWeight: '800', color: COLORS.black, letterSpacing: -2, padding: 0 },
  amtCur: { fontFamily: FONT, fontSize: 15, fontWeight: '600', color: COLORS.grey, marginBottom: 6 },

  sectionLabel: { fontFamily: FONT, fontSize: 10, fontWeight: '700', letterSpacing: 1.5, color: COLORS.grey, marginBottom: 10 },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FFF', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1.5, borderColor: '#EEEEEE',
  },
  catChipTxt: { fontFamily: FONT, fontSize: 12, fontWeight: '700', color: COLORS.grey },

  inputBox: { backgroundColor: '#FFF', borderRadius: 12, paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 14 : 10, borderWidth: 1, borderColor: '#EEEEEE', marginBottom: 20 },
  input: { fontFamily: FONT, fontSize: 15, color: COLORS.black, padding: 0 },

  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.errorSoft, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 16 },
  errorTxt: { flex: 1, fontFamily: FONT, fontSize: 12, color: COLORS.error, fontWeight: '500' },

  cta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: COLORS.black, borderRadius: 16, paddingVertical: 16, ...SHADOW },
  ctaDisabled: { backgroundColor: '#BBBBBB' },
  ctaTxt: { fontFamily: FONT, fontSize: 15, fontWeight: '700', color: '#FFF', letterSpacing: 0.3 },
  note: { fontFamily: FONT, fontSize: 11, color: COLORS.grey, textAlign: 'center', marginTop: 16, lineHeight: 16 },
});
