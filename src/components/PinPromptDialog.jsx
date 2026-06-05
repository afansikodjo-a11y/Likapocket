import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Modal,
  StyleSheet, Platform, KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Lock, X, ArrowRight } from 'lucide-react-native';
import { COLORS, FONT, SPACE } from '../theme';

/**
 * Mini-dialog pour demander juste un PIN (4 à 6 chiffres) avant d'exécuter
 * une action. Utilisé typiquement par ForfaitActionScreen quand l'user tape
 * sur un forfait — on lui demande son PIN MoMo pour compléter l'USSD.
 *
 * Props :
 *   - visible: boolean
 *   - title: string  — ex. "Confirme avec ton PIN Mixx"
 *   - subtitle?: string  — ex. "100 Mo - 200 F"
 *   - onClose: () => void
 *   - onConfirm: (pin: string) => void
 */
export default function PinPromptDialog({
  visible, title = 'Confirme ton PIN', subtitle,
  onClose, onConfirm,
}) {
  const insets = useSafeAreaInsets();
  const [pin, setPin] = useState('');

  useEffect(() => {
    if (visible) setPin('');
  }, [visible]);

  const handleConfirm = () => {
    if (pin.length < 4) return;
    onConfirm?.(pin);
    setPin('');
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={s.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={s.card}>
          {/* Close */}
          <TouchableOpacity style={s.closeBtn} onPress={onClose} hitSlop={10}>
            <X size={18} color={COLORS.grey} strokeWidth={2.2} />
          </TouchableOpacity>

          {/* Icon */}
          <LinearGradient
            colors={['#D69E4E', '#B5822D']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.icon}
          >
            <Lock size={24} color="#FFF" strokeWidth={2} />
          </LinearGradient>

          <Text style={s.title}>{title}</Text>
          {subtitle ? <Text style={s.subtitle}>{subtitle}</Text> : null}

          {/* PIN input (silent dots) */}
          <View style={s.inputBox}>
            <TextInput
              style={s.input}
              value={pin}
              onChangeText={(v) => setPin(v.replace(/\D/g, '').slice(0, 6))}
              placeholder="•  •  •  •"
              placeholderTextColor="#C9C9C9"
              keyboardType="number-pad"
              secureTextEntry
              maxLength={6}
              autoFocus
            />
          </View>

          <Text style={s.help}>4 à 6 chiffres — Code Mobile Money</Text>

          <TouchableOpacity
            style={[s.cta, pin.length < 4 && s.ctaDisabled]}
            onPress={handleConfirm}
            disabled={pin.length < 4}
            activeOpacity={0.88}
          >
            <Text style={s.ctaTxt}>Confirmer</Text>
            <ArrowRight size={17} color="#FFF" strokeWidth={2.4} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const SHADOW = Platform.select({
  ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 18 },
  default: { elevation: 6 },
});

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: SPACE.lg },
  card: {
    width: '100%', maxWidth: 360,
    backgroundColor: COLORS.bg, borderRadius: 24,
    paddingTop: 32, paddingBottom: 22, paddingHorizontal: 22,
    alignItems: 'center', ...SHADOW,
  },
  closeBtn: {
    position: 'absolute', top: 14, right: 14,
    width: 32, height: 32, borderRadius: 16, backgroundColor: '#FFF',
    alignItems: 'center', justifyContent: 'center',
  },

  icon: {
    width: 60, height: 60, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center', marginBottom: 14, ...SHADOW,
  },

  title:    { fontFamily: FONT, fontSize: 17, fontWeight: '800', color: COLORS.black, letterSpacing: -0.3, marginBottom: 4, textAlign: 'center' },
  subtitle: { fontFamily: FONT, fontSize: 12, color: COLORS.grey, textAlign: 'center', marginBottom: 20 },

  inputBox: {
    width: '100%',
    backgroundColor: '#FFF', borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    borderWidth: 1, borderColor: '#EEEEEE',
    marginBottom: 6,
  },
  input: {
    fontFamily: FONT, fontSize: 22, fontWeight: '700',
    color: COLORS.black, padding: 0, letterSpacing: 8, textAlign: 'center',
  },

  help: { fontFamily: FONT, fontSize: 11, color: COLORS.grey, marginBottom: 18 },

  cta: {
    width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.gold, borderRadius: 14, paddingVertical: 14,
    ...SHADOW,
  },
  ctaDisabled: { backgroundColor: '#BBBBBB' },
  ctaTxt: { fontFamily: FONT, fontSize: 15, fontWeight: '800', color: '#FFF', letterSpacing: 0.3 },
});
