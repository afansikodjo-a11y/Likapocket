import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, Modal, StyleSheet,
  Platform, Vibration, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Lock, X, Delete, Fingerprint,
} from 'lucide-react-native';
import {
  isPinSet, verifyPin,
  authenticateBiometric, isBiometricEnabled,
} from '../services/pinService';
import { COLORS, FONT, SPACE } from '../theme';

const PIN_LENGTH = 4;
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'bio', '0', 'del'];

// ── PIN dots ───────────────────────────────────────────────────────────────

function PinDots({ filled, error }) {
  return (
    <View style={s.dotsRow}>
      {Array.from({ length: PIN_LENGTH }).map((_, i) => (
        <View
          key={i}
          style={[s.dot, i < filled && s.dotFilled, error && s.dotError]}
        />
      ))}
    </View>
  );
}

// ── Keypad ────────────────────────────────────────────────────────────────

function Keypad({ onPress, showBio, onBio }) {
  return (
    <View style={s.keypad}>
      {KEYS.map((k) => {
        if (k === 'bio') {
          return showBio ? (
            <TouchableOpacity key={k} style={s.key} onPress={onBio} activeOpacity={0.6}>
              <Fingerprint size={24} color={COLORS.gold} strokeWidth={2} />
            </TouchableOpacity>
          ) : (
            <View key={k} style={s.key} />
          );
        }
        if (k === 'del') {
          return (
            <TouchableOpacity key={k} style={s.key} onPress={() => onPress('del')} activeOpacity={0.6}>
              <Delete size={22} color={COLORS.grey} strokeWidth={2} />
            </TouchableOpacity>
          );
        }
        return (
          <TouchableOpacity key={k} style={s.key} onPress={() => onPress(k)} activeOpacity={0.6}>
            <Text style={s.keyTxt}>{k}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────

/**
 * Modal de re-authentification pour les actions sensibles.
 *
 *   <SecurityPrompt
 *     visible={pending}
 *     reason="Confirmer l'envoi"
 *     onSuccess={() => doStuff()}
 *     onCancel={() => setPending(false)}
 *   />
 *
 * Si aucun PIN n'est configuré sur le device, onSuccess est appelé immédiatement
 * (pas de protection à faire respecter).
 */
export default function SecurityPrompt({
  visible,
  reason = "Confirmer l'opération",
  onSuccess,
  onCancel,
}) {
  const [pin,        setPin]        = useState('');
  const [error,      setError]      = useState('');
  const [bioEnabled, setBioEnabled] = useState(false);
  const [hasPin,     setHasPin]     = useState(undefined); // undefined = checking
  const [checking,   setChecking]   = useState(false);

  // ── On open : check PIN/bio config ──
  useEffect(() => {
    if (!visible) return;
    setPin(''); setError('');
    let cancelled = false;

    (async () => {
      const set = await isPinSet();
      if (cancelled) return;
      if (!set) {
        // Aucune protection configurée → on laisse passer
        onSuccess?.();
        setHasPin(false);
        return;
      }
      setHasPin(true);
      const bio = await isBiometricEnabled();
      setBioEnabled(bio);
      if (bio) {
        const ok = await authenticateBiometric(reason);
        if (cancelled) return;
        if (ok) onSuccess?.();
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // ── Verify on full PIN entered ──
  useEffect(() => {
    if (pin.length !== PIN_LENGTH || checking) return;
    setChecking(true);
    (async () => {
      const ok = await verifyPin(pin);
      setChecking(false);
      if (ok) {
        onSuccess?.();
        setPin('');
      } else {
        setError('Code PIN incorrect.');
        if (Platform.OS !== 'web') Vibration.vibrate(150);
        setTimeout(() => { setPin(''); setError(''); }, 600);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  const handleKey = useCallback((k) => {
    setError('');
    if (k === 'del') {
      setPin((p) => p.slice(0, -1));
      return;
    }
    setPin((p) => (p.length < PIN_LENGTH ? p + k : p));
  }, []);

  const handleBio = useCallback(async () => {
    const ok = await authenticateBiometric(reason);
    if (ok) onSuccess?.();
  }, [reason, onSuccess]);

  // Pas de PIN configuré → on n'affiche rien (onSuccess déjà appelé)
  if (hasPin === false) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={s.backdrop}>
        <View style={s.card}>
          {/* Close */}
          <TouchableOpacity style={s.closeBtn} onPress={onCancel} hitSlop={12}>
            <X size={18} color={COLORS.grey} strokeWidth={2.2} />
          </TouchableOpacity>

          {/* Lock icon */}
          <LinearGradient
            colors={['#D69E4E', '#B5822D']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.icon}
          >
            <Lock size={26} color="#FFF" strokeWidth={2} />
          </LinearGradient>

          <Text style={s.title}>Confirmer l'action</Text>
          <Text style={s.subtitle}>{reason}</Text>

          {hasPin === undefined ? (
            <ActivityIndicator color={COLORS.gold} style={{ marginVertical: 28 }} />
          ) : (
            <>
              <PinDots filled={pin.length} error={!!error} />
              <View style={s.errorWrap}>
                {error
                  ? <Text style={s.errorTxt}>{error}</Text>
                  : checking
                    ? <ActivityIndicator color={COLORS.gold} />
                    : <Text style={s.errorTxt}> </Text>}
              </View>

              <Keypad onPress={handleKey} showBio={bioEnabled} onBio={handleBio} />
            </>
          )}
        </View>
      </View>
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
    paddingTop: 32, paddingBottom: 20, paddingHorizontal: 20,
    alignItems: 'center', ...SHADOW,
  },
  closeBtn: {
    position: 'absolute', top: 14, right: 14,
    width: 32, height: 32, borderRadius: 16, backgroundColor: '#FFF',
    alignItems: 'center', justifyContent: 'center',
  },
  icon: {
    width: 64, height: 64, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16, ...SHADOW,
  },
  title:    { fontFamily: FONT, fontSize: 18, fontWeight: '800', color: COLORS.black, letterSpacing: -0.3, marginBottom: 6, textAlign: 'center' },
  subtitle: { fontFamily: FONT, fontSize: 12, color: COLORS.grey, textAlign: 'center', paddingHorizontal: 20, lineHeight: 18, marginBottom: 20 },

  // Dots
  dotsRow:   { flexDirection: 'row', gap: 14, marginBottom: 6 },
  dot:       { width: 12, height: 12, borderRadius: 6, backgroundColor: '#E5E5E5' },
  dotFilled: { backgroundColor: COLORS.gold },
  dotError:  { backgroundColor: COLORS.error },

  errorWrap: { height: 28, alignItems: 'center', justifyContent: 'center', marginVertical: 4 },
  errorTxt:  { fontFamily: FONT, fontSize: 11, color: COLORS.error, fontWeight: '600' },

  // Keypad
  keypad:  { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10, width: '100%', paddingHorizontal: 6 },
  key:     {
    width: '31%', aspectRatio: 1.8,
    backgroundColor: '#FFF', borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', ...SHADOW,
  },
  keyTxt:  { fontFamily: FONT, fontSize: 22, fontWeight: '700', color: COLORS.black, letterSpacing: 1 },
});
