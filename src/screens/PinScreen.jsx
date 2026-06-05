import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Platform,
  ActivityIndicator, Vibration,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Lock, Delete, ArrowLeft, Fingerprint, ShieldCheck,
} from 'lucide-react-native';
import {
  setPin, verifyPin, authenticateBiometric, isBiometricEnabled,
} from '../services/pinService';
import { COLORS, FONT, SPACE } from '../theme';

const PIN_LENGTH = 4;

// ── PIN dots ──────────────────────────────────────────────────────────────

function PinDots({ length, filled, error }) {
  return (
    <View style={s.dotsRow}>
      {Array.from({ length }).map((_, i) => (
        <View
          key={i}
          style={[
            s.dot,
            i < filled && s.dotFilled,
            error && s.dotError,
          ]}
        />
      ))}
    </View>
  );
}

// ── Keypad ────────────────────────────────────────────────────────────────

const KEYS = ['1','2','3','4','5','6','7','8','9','bio','0','del'];

function Keypad({ onPress, showBio, onBio }) {
  return (
    <View style={s.keypad}>
      {KEYS.map((k) => {
        if (k === 'bio') {
          return showBio ? (
            <TouchableOpacity key={k} style={s.key} onPress={onBio} activeOpacity={0.6}>
              <Fingerprint size={26} color={COLORS.gold} strokeWidth={2} />
            </TouchableOpacity>
          ) : <View key={k} style={s.key} />;
        }
        if (k === 'del') {
          return (
            <TouchableOpacity key={k} style={s.key} onPress={() => onPress('del')} activeOpacity={0.6}>
              <Delete size={24} color={COLORS.grey} strokeWidth={2} />
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

// ── Main screen ───────────────────────────────────────────────────────────

/**
 * Modes :
 *  - 'setup'   : créer un nouveau PIN (saisie + confirmation)
 *  - 'verify'  : déverrouiller avec un PIN existant
 *  - 'change'  : changer le PIN (vérifie l'ancien puis saisit le nouveau)
 */
export default function PinScreen({ navigation, route, mode: modeProp, onUnlock, canCancel: cancelProp }) {
  const insets = useSafeAreaInsets();
  const {
    mode      = modeProp ?? 'verify',
    onSuccess = onUnlock,
    canCancel = cancelProp ?? (modeProp ? false : (route?.params?.mode !== 'verify')),
  } = route?.params ?? {};

  const [pin,         setPinValue]    = useState('');
  const [confirmPin,  setConfirmPin]  = useState('');
  const [step,        setStep]        = useState(mode === 'setup' ? 'create' : mode === 'change' ? 'old' : 'verify');
  const [error,       setError]       = useState('');
  const [shake,       setShake]       = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [bioEnabled,  setBioEnabled]  = useState(false);

  // ── Detect biometric availability for verify step ──
  useEffect(() => {
    if (step === 'verify') {
      isBiometricEnabled().then(setBioEnabled);
    }
  }, [step]);

  // ── Auto-prompt biometric on verify mount ──
  useEffect(() => {
    if (step === 'verify' && bioEnabled) {
      handleBio();
    }
  }, [bioEnabled]);

  // ── Title + subtitle by step ──
  const ui = {
    create:  { title: 'Choisis un code PIN', subtitle: 'Ce code protégera ton accès à LikaPocket.' },
    confirm: { title: 'Confirme ton code',   subtitle: 'Saisis à nouveau le code à 4 chiffres.' },
    old:     { title: 'Code actuel',         subtitle: 'Entre ton code PIN actuel pour le modifier.' },
    new:     { title: 'Nouveau code PIN',    subtitle: 'Choisis un nouveau code à 4 chiffres.' },
    verify:  { title: 'Code PIN',            subtitle: 'Entre ton code pour déverrouiller LikaPocket.' },
  }[step];

  const reset = () => {
    setPinValue('');
    setConfirmPin('');
    setError('');
  };

  const triggerError = (msg) => {
    setError(msg);
    setShake(true);
    if (Platform.OS !== 'web') Vibration.vibrate(150);
    setTimeout(() => setShake(false), 400);
    setTimeout(() => { setPinValue(''); setConfirmPin(''); }, 400);
  };

  const handleKey = useCallback((k) => {
    setError('');
    const current = (step === 'confirm') ? confirmPin : pin;
    if (k === 'del') {
      if (step === 'confirm') setConfirmPin(current.slice(0, -1));
      else                     setPinValue(current.slice(0, -1));
      return;
    }
    if (current.length >= PIN_LENGTH) return;
    const next = current + k;
    if (step === 'confirm') setConfirmPin(next);
    else                     setPinValue(next);
  }, [pin, confirmPin, step]);

  // ── Submit logic per step ──
  useEffect(() => {
    const submit = async () => {
      // CREATE → ask confirmation
      if (step === 'create' && pin.length === PIN_LENGTH) {
        setTimeout(() => setStep('confirm'), 120);
        return;
      }
      // CONFIRM → save PIN
      if (step === 'confirm' && confirmPin.length === PIN_LENGTH) {
        if (confirmPin !== pin) {
          triggerError('Les codes ne correspondent pas.');
          setStep('create');
          return;
        }
        setLoading(true);
        try {
          await setPin(pin);
          onSuccess?.();
          navigation.goBack();
        } catch (e) {
          triggerError(e.message);
        } finally {
          setLoading(false);
        }
        return;
      }
      // OLD → verify and move to new
      if (step === 'old' && pin.length === PIN_LENGTH) {
        const ok = await verifyPin(pin);
        if (!ok) { triggerError('Code PIN incorrect.'); return; }
        setPinValue('');
        setStep('new');
        return;
      }
      // NEW (in change flow) → save directly
      if (step === 'new' && pin.length === PIN_LENGTH) {
        setLoading(true);
        try {
          await setPin(pin);
          onSuccess?.();
          navigation.goBack();
        } catch (e) {
          triggerError(e.message);
        } finally {
          setLoading(false);
        }
        return;
      }
      // VERIFY → unlock
      if (step === 'verify' && pin.length === PIN_LENGTH) {
        setLoading(true);
        const ok = await verifyPin(pin);
        setLoading(false);
        if (ok) {
          onSuccess?.();
          if (canCancel) navigation.goBack();
        } else {
          triggerError('Code PIN incorrect.');
        }
      }
    };
    submit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin, confirmPin, step]);

  // ── Biometric handler ──
  const handleBio = async () => {
    const ok = await authenticateBiometric('Déverrouiller LikaPocket');
    if (ok) {
      onSuccess?.();
      if (canCancel) navigation.goBack();
    }
  };

  // ── Display value ──
  const filled = (step === 'confirm') ? confirmPin.length : pin.length;

  return (
    <View style={[s.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* ── Header ── */}
      <View style={s.headerBar}>
        {canCancel ? (
          <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <ArrowLeft size={20} color={COLORS.black} strokeWidth={2.2} />
          </TouchableOpacity>
        ) : <View style={{ width: 40 }} />}
        <View style={{ width: 40 }} />
      </View>

      {/* ── Lock icon ── */}
      <View style={s.iconWrap}>
        <LinearGradient
          colors={['#D69E4E', '#B5822D']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.iconCircle}
        >
          {step === 'verify'
            ? <Lock        size={32} color="#FFF" strokeWidth={2} />
            : <ShieldCheck size={32} color="#FFF" strokeWidth={2} />}
        </LinearGradient>
      </View>

      {/* ── Title & subtitle ── */}
      <Text style={s.title}>{ui.title}</Text>
      <Text style={s.subtitle}>{ui.subtitle}</Text>

      {/* ── Dots ── */}
      <View style={[s.dotsContainer, shake && s.shake]}>
        <PinDots length={PIN_LENGTH} filled={filled} error={!!error} />
      </View>

      {/* ── Error / loader ── */}
      <View style={s.statusRow}>
        {loading ? <ActivityIndicator color={COLORS.gold} /> :
         error   ? <Text style={s.errorTxt}>{error}</Text> :
                    <Text style={s.helpTxt}>•</Text>}
      </View>

      {/* ── Keypad ── */}
      <View style={s.keypadWrap}>
        <Keypad
          onPress={handleKey}
          showBio={step === 'verify' && bioEnabled}
          onBio={handleBio}
        />
      </View>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const SHADOW = Platform.select({
  ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.12, shadowRadius: 16 },
  default: { elevation: 5 },
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

  // Icon
  iconWrap:   { alignItems: 'center', marginTop: 24, marginBottom: 24 },
  iconCircle: { width: 76, height: 76, borderRadius: 24, alignItems: 'center', justifyContent: 'center', ...SHADOW },

  // Texts
  title:    { fontFamily: FONT, fontSize: 22, fontWeight: '800', color: COLORS.black, textAlign: 'center', letterSpacing: -0.5, marginBottom: 8 },
  subtitle: { fontFamily: FONT, fontSize: 13, color: COLORS.grey, textAlign: 'center', paddingHorizontal: 40, lineHeight: 20, marginBottom: 32 },

  // Dots
  dotsContainer: { alignItems: 'center' },
  dotsRow:       { flexDirection: 'row', gap: 16 },
  dot: {
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: '#E5E5E5',
  },
  dotFilled: { backgroundColor: COLORS.gold },
  dotError:  { backgroundColor: COLORS.error },
  shake:     { transform: [{ translateX: 0 }] },

  // Status
  statusRow: { height: 32, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  errorTxt:  { fontFamily: FONT, fontSize: 12, color: COLORS.error, fontWeight: '600' },
  helpTxt:   { color: 'transparent', fontSize: 12 },

  // Keypad
  keypadWrap: { flex: 1, justifyContent: 'flex-end', paddingHorizontal: SPACE.xl, paddingBottom: 16 },
  keypad: {
    flexDirection: 'row', flexWrap: 'wrap',
    justifyContent: 'space-between', rowGap: 14,
  },
  key: {
    width: '31%',
    aspectRatio: 1.6,
    backgroundColor: '#FFF',
    borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    ...SHADOW,
  },
  keyTxt: { fontFamily: FONT, fontSize: 24, fontWeight: '700', color: COLORS.black, letterSpacing: 1 },
});
