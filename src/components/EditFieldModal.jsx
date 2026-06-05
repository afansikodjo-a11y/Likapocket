import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Modal,
  StyleSheet, Platform, ActivityIndicator,
  KeyboardAvoidingView, ScrollView, FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Check, AlertCircle } from 'lucide-react-native';
import { COUNTRIES, zoneLabel, findCountry } from '../data/countries';
import { COLORS, FONT, SPACE } from '../theme';

// ── Country picker (sub-component) ────────────────────────────────────────

function CountryList({ selectedCode, onSelect }) {
  return (
    <FlatList
      data={COUNTRIES}
      keyExtractor={(c) => c.code}
      style={{ maxHeight: 380 }}
      renderItem={({ item }) => {
        const on = selectedCode === item.code;
        return (
          <TouchableOpacity
            style={[s.cRow, on && s.cRowActive]}
            onPress={() => onSelect(item)}
            activeOpacity={0.7}
          >
            <Text style={s.cFlag}>{item.flag}</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.cName}>{item.label}</Text>
              <Text style={s.cZone}>{zoneLabel(item.zone)}</Text>
            </View>
            <Text style={s.cDial}>{item.dial}</Text>
            {on && <Check size={16} color={COLORS.gold} strokeWidth={2.5} />}
          </TouchableOpacity>
        );
      }}
      ItemSeparatorComponent={() => <View style={s.cSep} />}
      showsVerticalScrollIndicator={false}
    />
  );
}

// ── Main ──────────────────────────────────────────────────────────────────

/**
 * Modal d'édition pour un champ unique du profil.
 *
 * @param {object} props
 * @param {boolean} props.visible
 * @param {string} props.title           ex. "Modifier le nom complet"
 * @param {string} props.label           ex. "NOM COMPLET"
 * @param {'text'|'phone'|'country'|'choices'} props.type
 * @param {Array<{value:string,label:string,sub?:string,emoji?:string}>} [props.choices]
 * @param {string} props.initialValue
 * @param {(value: string|object) => Promise<void>} props.onSave
 * @param {() => void} props.onClose
 */
export default function EditFieldModal({
  visible, title, label,
  type = 'text',
  placeholder, initialValue, choices,
  onSave, onClose,
}) {
  const insets = useSafeAreaInsets();
  const [value,   setValue]   = useState('');
  const [country, setCountry] = useState(null);
  const [choice,  setChoice]  = useState(null);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');

  // Reset on each open
  useEffect(() => {
    if (!visible) return;
    setError('');
    setSaving(false);
    if (type === 'country') {
      setCountry(findCountry(initialValue) ?? COUNTRIES[0]);
      setValue('');
      setChoice(null);
    } else if (type === 'choices') {
      const initial = (choices ?? []).find((c) => c.value === initialValue) ?? choices?.[0] ?? null;
      setChoice(initial);
      setValue('');
      setCountry(null);
    } else {
      setValue(initialValue ?? '');
      setCountry(null);
      setChoice(null);
    }
  }, [visible, type, initialValue, choices]);

  const handleSave = async () => {
    setError('');
    let payload;

    if (type === 'phone') {
      const trimmed = value.trim();
      const digits = trimmed.replace(/\D/g, '');
      if (digits.length < 8) { setError('Numéro trop court.'); return; }
      payload = trimmed;
    } else if (type === 'country') {
      if (!country) { setError('Sélectionnez un pays.'); return; }
      payload = country.code;
    } else if (type === 'choices') {
      if (!choice) { setError('Sélectionnez une option.'); return; }
      payload = choice.value;
    } else {
      const trimmed = value.trim();
      if (!trimmed) { setError('Ce champ ne peut pas être vide.'); return; }
      payload = trimmed;
    }

    setSaving(true);
    try {
      await onSave(payload);
      onClose?.();
    } catch (e) {
      setError(e?.message ?? 'Erreur lors de la sauvegarde.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={s.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
      >
        <View style={[s.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={s.handle} />

          {/* Header */}
          <View style={s.header}>
            <Text style={s.title}>{title}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={10} style={s.closeBtn}>
              <X size={18} color={COLORS.grey} strokeWidth={2.2} />
            </TouchableOpacity>
          </View>

          {/* Body */}
          <ScrollView
            contentContainerStyle={s.body}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            showsVerticalScrollIndicator={false}
          >
            {type === 'country' ? (
              <>
                <Text style={s.fieldLabel}>{label}</Text>
                <View style={s.countryList}>
                  <CountryList
                    selectedCode={country?.code}
                    onSelect={setCountry}
                  />
                </View>
              </>
            ) : type === 'choices' ? (
              <>
                <Text style={s.fieldLabel}>{label}</Text>
                <View style={s.choiceList}>
                  {(choices ?? []).map((c, idx) => {
                    const on = choice?.value === c.value;
                    return (
                      <TouchableOpacity
                        key={c.value}
                        style={[s.cRow, on && s.cRowActive, idx !== 0 && { borderTopWidth: 1, borderTopColor: '#F4F4F4' }]}
                        onPress={() => setChoice(c)}
                        activeOpacity={0.7}
                      >
                        {c.emoji && <Text style={s.cFlag}>{c.emoji}</Text>}
                        <View style={{ flex: 1 }}>
                          <Text style={s.cName}>{c.label}</Text>
                          {c.sub && <Text style={s.cZone}>{c.sub}</Text>}
                        </View>
                        {on && <Check size={16} color={COLORS.gold} strokeWidth={2.5} />}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            ) : (
              <>
                <Text style={s.fieldLabel}>{label}</Text>
                <View style={s.inputBox}>
                  <TextInput
                    style={s.input}
                    value={value}
                    onChangeText={setValue}
                    placeholder={placeholder}
                    placeholderTextColor="#C9C9C9"
                    keyboardType={type === 'phone' ? 'phone-pad' : 'default'}
                    autoCapitalize={type === 'phone' ? 'none' : 'words'}
                    autoFocus
                  />
                </View>
              </>
            )}

            {error ? (
              <View style={s.errorRow}>
                <AlertCircle size={14} color={COLORS.error} strokeWidth={2.5} />
                <Text style={s.errorTxt}>{error}</Text>
              </View>
            ) : null}
          </ScrollView>

          {/* CTA */}
          <TouchableOpacity
            style={[s.cta, saving && s.ctaDisabled]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.88}
          >
            {saving
              ? <ActivityIndicator color="#FFF" />
              : (
                <>
                  <Check size={17} color="#FFF" strokeWidth={2.5} />
                  <Text style={s.ctaTxt}>Enregistrer</Text>
                </>
              )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const SHADOW = Platform.select({
  ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.12, shadowRadius: 16 },
  default: { elevation: 5 },
});

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: COLORS.bg,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingTop: 12, paddingHorizontal: SPACE.lg,
    maxHeight: '90%',
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: '#E0E0E0', marginBottom: 16 },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  title:  { fontFamily: FONT, fontSize: 17, fontWeight: '800', color: COLORS.black, letterSpacing: -0.3, flex: 1, marginRight: 12 },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: '#FFF',
    alignItems: 'center', justifyContent: 'center',
  },

  body: { paddingBottom: 16 },

  fieldLabel: { fontFamily: FONT, fontSize: 10, fontWeight: '700', letterSpacing: 1.5, color: COLORS.grey, marginBottom: 8 },
  inputBox: {
    backgroundColor: '#FFF', borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    borderWidth: 1, borderColor: '#EEEEEE',
  },
  input: { fontFamily: FONT, fontSize: 15, color: COLORS.black, padding: 0 },

  countryList: { backgroundColor: '#FFF', borderRadius: 14, ...SHADOW },
  choiceList:  { backgroundColor: '#FFF', borderRadius: 14, ...SHADOW, overflow: 'hidden' },
  cRow:        { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 12 },
  cRowActive:  { backgroundColor: COLORS.goldSoft },
  cFlag:       { fontSize: 22 },
  cName:       { fontFamily: FONT, fontSize: 14, fontWeight: '700', color: COLORS.black },
  cZone:       { fontFamily: FONT, fontSize: 11, color: COLORS.grey, marginTop: 2 },
  cDial:       { fontFamily: FONT, fontSize: 13, fontWeight: '700', color: COLORS.gold, letterSpacing: 0.3 },
  cSep:        { height: 1, backgroundColor: '#F4F4F4', marginLeft: 56 },

  errorRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.errorSoft, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10, marginTop: 12,
  },
  errorTxt: { flex: 1, fontFamily: FONT, fontSize: 12, color: COLORS.error, fontWeight: '500' },

  cta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.black, borderRadius: 14, paddingVertical: 15,
    marginTop: 4, ...SHADOW,
  },
  ctaDisabled: { backgroundColor: '#BBBBBB' },
  ctaTxt:      { fontFamily: FONT, fontSize: 15, fontWeight: '700', color: '#FFF', letterSpacing: 0.3 },
});
