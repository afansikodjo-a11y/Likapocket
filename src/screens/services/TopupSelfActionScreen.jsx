import { useState, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Platform, KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft, TrendingUp, AlertCircle, Eye, EyeOff,
} from 'lucide-react-native';
import { getService, OPERATORS } from '../../data/servicesTG';
import { dialUSSD, resolveUSSD } from '../../services/ussdHelper';
import { COLORS, FONT, SPACE } from '../../theme';

/**
 * Achat de crédit pour soi-même via le solde Mixx.
 * USSD : *145*3*1*1*{amount}*{pin}#
 */
export default function TopupSelfActionScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { serviceId } = route.params;
  const service = getService(serviceId);

  const [amount,  setAmount]  = useState('');
  const [pin,     setPin]     = useState('');
  const [showPin, setShowPin] = useState(false);

  if (!service) {
    return <View style={s.root}><Text style={{ padding: 20 }}>Service introuvable.</Text></View>;
  }

  const operator = OPERATORS[service.operator];
  const amt = parseInt((amount || '').replace(/\D/g, ''), 10) || 0;

  const previewUSSD = useMemo(() => {
    return resolveUSSD(service.ussdTemplate, {
      pin:    pin || 'PIN',
      amount: amt > 0 ? amt : 'MONTANT',
    });
  }, [service.ussdTemplate, pin, amt]);

  const isValid = amt > 0 && pin.length >= 4;

  const handleSend = () => {
    if (!isValid) return;
    const code = resolveUSSD(service.ussdTemplate, { pin, amount: amt });
    dialUSSD(code);
  };

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
    >
      <View style={{ paddingTop: insets.top }}>
        <View style={s.headerBar}>
          <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <ArrowLeft size={20} color={COLORS.black} strokeWidth={2.2} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Acheter du crédit</Text>
          <View style={{ width: 40 }} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={['#1A7F4B', '#22A55B']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.hero}
        >
          <View style={s.heroIcon}>
            <TrendingUp size={22} color="#FFF" strokeWidth={2.2} />
          </View>
          <Text style={s.heroOver}>{operator?.label ?? 'CRÉDIT'} · MIXX</Text>
          <Text style={s.heroTitle}>{service.label}</Text>
          <Text style={s.heroSub}>
            Recharge ton crédit Yas directement depuis ton solde Mixx, sans gratter de carte.
          </Text>
        </LinearGradient>

        <View style={s.form}>
          <Text style={s.fieldLabel}>MONTANT</Text>
          <View style={s.amountCard}>
            <TextInput
              style={s.amountInput}
              value={amount}
              onChangeText={(t) => setAmount(t.replace(/\D/g, ''))}
              placeholder="0"
              placeholderTextColor="#C9C9C9"
              keyboardType="number-pad"
              maxLength={9}
            />
            <Text style={s.amountCur}>F CFA</Text>
          </View>

          <Text style={s.fieldLabel}>CODE SECRET MIXX</Text>
          <View style={s.pinCard}>
            <TextInput
              style={s.pinInput}
              value={pin}
              onChangeText={(t) => setPin(t.replace(/\D/g, '').slice(0, 6))}
              placeholder="• • • •"
              placeholderTextColor="#C9C9C9"
              keyboardType="number-pad"
              secureTextEntry={!showPin}
              maxLength={6}
            />
            <TouchableOpacity onPress={() => setShowPin((v) => !v)} hitSlop={8}>
              {showPin
                ? <EyeOff size={17} color={COLORS.grey} strokeWidth={2} />
                : <Eye    size={17} color={COLORS.grey} strokeWidth={2} />}
            </TouchableOpacity>
          </View>

          <View style={s.previewCard}>
            <Text style={s.previewLabel}>CODE USSD QUI SERA COMPOSÉ</Text>
            <Text style={s.previewCode} numberOfLines={2}>{previewUSSD}</Text>
          </View>

          <TouchableOpacity
            style={[s.cta, !isValid && s.ctaDisabled]}
            onPress={handleSend}
            disabled={!isValid}
            activeOpacity={0.88}
          >
            <TrendingUp size={17} color="#FFF" strokeWidth={2.4} />
            <Text style={s.ctaTxt}>
              {amt > 0 ? `Recharger ${amt.toLocaleString('fr-FR')} F` : 'Recharger'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const RADIUS = 20;
const SHADOW = Platform.select({
  ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 12 },
  default: { elevation: 3 },
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

  hero: {
    marginHorizontal: SPACE.lg, marginTop: 8, marginBottom: 20,
    borderRadius: RADIUS, padding: 20, ...SHADOW,
  },
  heroIcon: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  heroOver:  { fontFamily: FONT, fontSize: 10, fontWeight: '700', letterSpacing: 1.5, color: 'rgba(255,255,255,0.85)', marginBottom: 4 },
  heroTitle: { fontFamily: FONT, fontSize: 22, fontWeight: '800', color: '#FFF', letterSpacing: -0.5, marginBottom: 6 },
  heroSub:   { fontFamily: FONT, fontSize: 12, color: 'rgba(255,255,255,0.85)', lineHeight: 17 },

  form: { paddingHorizontal: SPACE.lg },
  fieldLabel: { fontFamily: FONT, fontSize: 10, fontWeight: '700', letterSpacing: 2, color: COLORS.grey, marginBottom: 8, marginTop: 4 },

  amountCard: {
    flexDirection: 'row', alignItems: 'baseline', gap: 8,
    backgroundColor: '#FFF', borderRadius: RADIUS,
    paddingHorizontal: 16, paddingVertical: 14, marginBottom: 16, ...SHADOW,
  },
  amountInput: { flex: 1, fontFamily: FONT, fontSize: 32, fontWeight: '800', color: COLORS.black, padding: 0, letterSpacing: -1 },
  amountCur:   { fontFamily: FONT, fontSize: 14, fontWeight: '700', color: COLORS.grey },

  pinCard: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FFF', borderRadius: RADIUS,
    paddingHorizontal: 16, paddingVertical: 12, marginBottom: 16, ...SHADOW,
  },
  pinInput: { flex: 1, fontFamily: FONT, fontSize: 20, fontWeight: '700', color: COLORS.black, padding: 0, letterSpacing: 8 },

  previewCard: {
    backgroundColor: COLORS.black, borderRadius: 14,
    padding: 14, marginBottom: 16, alignItems: 'center',
  },
  previewLabel: { fontFamily: FONT, fontSize: 9, fontWeight: '700', letterSpacing: 2, color: 'rgba(255,255,255,0.6)', marginBottom: 6 },
  previewCode:  { fontFamily: FONT, fontSize: 16, fontWeight: '800', color: COLORS.gold, letterSpacing: 0.5, textAlign: 'center' },

  cta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.success, borderRadius: 16, paddingVertical: 16,
    ...SHADOW,
  },
  ctaDisabled: { backgroundColor: '#BBBBBB' },
  ctaTxt: { fontFamily: FONT, fontSize: 15, fontWeight: '800', color: '#FFF', letterSpacing: 0.3 },
});
