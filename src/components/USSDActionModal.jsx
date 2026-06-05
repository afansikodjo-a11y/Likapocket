import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Modal,
  StyleSheet, Platform, ActivityIndicator,
  KeyboardAvoidingView, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  X, Phone, AlertCircle, ChevronRight,
} from 'lucide-react-native';
import { dialUSSD, resolveUSSD } from '../services/ussdHelper';
import { COLORS, FONT, SPACE } from '../theme';

/**
 * Modal de confirmation avant d'ouvrir le dialer USSD.
 * Permet de saisir les paramètres si le service en requiert (montant, code, etc.)
 *
 * Props :
 *   - visible: boolean
 *   - service: { label, description, ussd, params, extraInfo? }
 *   - onClose: () => void
 */
export default function USSDActionModal({ visible, service, onClose }) {
  const insets = useSafeAreaInsets();
  const [values,  setValues]  = useState({});
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  // Reset à chaque ouverture
  useEffect(() => {
    if (!visible) return;
    setValues({});
    setError('');
    setLoading(false);
  }, [visible, service]);

  if (!service) return null;

  const setParam = (key, value) => setValues((v) => ({ ...v, [key]: value }));

  // Validation : tous les params requis doivent être remplis
  const allFilled = (service.params ?? []).every((p) => {
    const v = (values[p.key] ?? '').toString().trim();
    if (!v) return false;
    if (p.maxLength && v.length > p.maxLength) return false;
    return true;
  });

  // Aperçu du code USSD résolu
  const finalUSSD = resolveUSSD(service.ussd, values);

  const handleDial = async () => {
    setError('');
    if (!allFilled) {
      setError('Remplis tous les champs requis.');
      return;
    }
    setLoading(true);
    const ok = await dialUSSD(finalUSSD);
    setLoading(false);
    if (ok) onClose?.();
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
            <View style={{ flex: 1 }}>
              <Text style={s.title} numberOfLines={2}>{service.label}</Text>
              {service.description && (
                <Text style={s.subtitle} numberOfLines={2}>{service.description}</Text>
              )}
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={10} style={s.closeBtn}>
              <X size={18} color={COLORS.grey} strokeWidth={2.2} />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={s.body}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            showsVerticalScrollIndicator={false}
          >
            {/* Paramètres dynamiques */}
            {(service.params ?? []).map((p) => (
              <View key={p.key} style={s.field}>
                <Text style={s.fieldLabel}>{p.label}</Text>
                <View style={s.inputBox}>
                  <TextInput
                    style={s.input}
                    value={values[p.key] ?? ''}
                    onChangeText={(v) => setParam(p.key, v)}
                    placeholder={p.placeholder ?? ''}
                    placeholderTextColor="#C9C9C9"
                    keyboardType={p.keyboard ?? 'default'}
                    maxLength={p.maxLength}
                    autoFocus
                  />
                </View>
              </View>
            ))}

            {/* Info extra (ex: "Sélectionne CEET dans le menu") */}
            {service.extraInfo && (
              <View style={s.infoRow}>
                <AlertCircle size={14} color={COLORS.gold} strokeWidth={2.2} />
                <Text style={s.infoTxt}>{service.extraInfo}</Text>
              </View>
            )}

            {/* Aperçu du code USSD */}
            <View style={s.previewCard}>
              <Text style={s.previewLabel}>CODE USSD QUI SERA COMPOSÉ</Text>
              <Text style={s.previewCode}>{finalUSSD || '—'}</Text>
            </View>

            {/* Erreur */}
            {error ? (
              <View style={s.errorRow}>
                <AlertCircle size={14} color={COLORS.error} strokeWidth={2.5} />
                <Text style={s.errorTxt}>{error}</Text>
              </View>
            ) : null}
          </ScrollView>

          {/* CTA */}
          <TouchableOpacity
            style={[s.cta, (!allFilled || loading) && s.ctaDisabled]}
            onPress={handleDial}
            disabled={!allFilled || loading}
            activeOpacity={0.88}
          >
            {loading
              ? <ActivityIndicator color="#FFF" />
              : (
                <>
                  <Phone size={17} color="#FFF" strokeWidth={2.4} />
                  <Text style={s.ctaTxt}>Ouvrir le dialer</Text>
                  <ChevronRight size={17} color="#FFF" strokeWidth={2.4} />
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

  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 20 },
  title:    { fontFamily: FONT, fontSize: 17, fontWeight: '800', color: COLORS.black, letterSpacing: -0.3 },
  subtitle: { fontFamily: FONT, fontSize: 12, color: COLORS.grey, lineHeight: 18, marginTop: 4 },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: '#FFF',
    alignItems: 'center', justifyContent: 'center',
  },

  body: { paddingBottom: 16 },

  field:      { marginBottom: 14 },
  fieldLabel: { fontFamily: FONT, fontSize: 10, fontWeight: '700', letterSpacing: 1.5, color: COLORS.grey, marginBottom: 7 },
  inputBox: {
    backgroundColor: '#FFF', borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    borderWidth: 1, borderColor: '#EEEEEE',
  },
  input: { fontFamily: FONT, fontSize: 15, color: COLORS.black, padding: 0, letterSpacing: 0.5 },

  // Info extra
  infoRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: COLORS.goldSoft, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10, marginBottom: 14,
  },
  infoTxt: { flex: 1, fontFamily: FONT, fontSize: 12, color: COLORS.gold, fontWeight: '600', lineHeight: 17 },

  // Preview USSD
  previewCard: {
    backgroundColor: COLORS.black, borderRadius: 14,
    padding: 14, marginBottom: 14, alignItems: 'center',
  },
  previewLabel: { fontFamily: FONT, fontSize: 9, fontWeight: '700', letterSpacing: 2, color: 'rgba(255,255,255,0.6)', marginBottom: 6 },
  previewCode:  { fontFamily: FONT, fontSize: 22, fontWeight: '800', color: COLORS.gold, letterSpacing: 1.5 },

  // Error
  errorRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.errorSoft, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12,
  },
  errorTxt: { flex: 1, fontFamily: FONT, fontSize: 12, color: COLORS.error, fontWeight: '500' },

  // CTA
  cta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.gold, borderRadius: 16, paddingVertical: 16,
    marginTop: 4, ...SHADOW,
  },
  ctaDisabled: { backgroundColor: '#BBBBBB' },
  ctaTxt: { fontFamily: FONT, fontSize: 15, fontWeight: '800', color: '#FFF', letterSpacing: 0.3 },
});
