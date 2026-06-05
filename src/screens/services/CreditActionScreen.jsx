import { useState, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Platform, KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft, PhoneCall, AlertCircle, Zap,
} from 'lucide-react-native';
import { getService, OPERATORS } from '../../data/servicesTG';
import { dialUSSD, resolveUSSD } from '../../services/ussdHelper';
import { COLORS, FONT, SPACE } from '../../theme';

export default function CreditActionScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { serviceId } = route.params;
  const service = getService(serviceId);

  const [code, setCode] = useState('');

  if (!service) {
    return <View style={s.root}><Text style={{ padding: 20 }}>Service introuvable.</Text></View>;
  }

  const operator = OPERATORS[service.operator];

  // USSD preview
  const previewUSSD = useMemo(() => {
    return resolveUSSD(service.ussdTemplate, {
      code: code || 'CODE',
    });
  }, [service.ussdTemplate, code]);

  // Validation : 14 chiffres typique pour Yas, varie pour Moov
  const isValid = code.length >= 10 && code.length <= 20;

  const handleSend = () => {
    if (!isValid) return;
    const finalCode = resolveUSSD(service.ussdTemplate, { code });
    dialUSSD(finalCode);
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
          <Text style={s.headerTitle}>Recharge</Text>
          <View style={{ width: 40 }} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={['#1A7F4B', '#22A55B']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.hero}
        >
          <View style={s.heroIcon}>
            <PhoneCall size={22} color="#FFF" strokeWidth={2.2} />
          </View>
          <Text style={s.heroOver}>{operator?.label ?? 'CRÉDIT TÉLÉPHONE'}</Text>
          <Text style={s.heroTitle}>{service.label}</Text>
          <Text style={s.heroSub}>
            Gratte ta carte de recharge et saisis le code à 14 chiffres.
          </Text>
        </LinearGradient>

        <View style={s.form}>
          <Text style={s.fieldLabel}>CODE DE RECHARGE</Text>
          <View style={s.codeCard}>
            <Zap size={18} color={COLORS.gold} strokeWidth={2.4} />
            <TextInput
              style={s.codeInput}
              value={code}
              onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 20))}
              placeholder="14 chiffres à gratter"
              placeholderTextColor="#C9C9C9"
              keyboardType="number-pad"
              maxLength={20}
              autoFocus
            />
            <Text style={s.codeCount}>{code.length}</Text>
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
            <Zap size={17} color="#FFF" strokeWidth={2.4} />
            <Text style={s.ctaTxt}>Recharger maintenant</Text>
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
  fieldLabel: { fontFamily: FONT, fontSize: 10, fontWeight: '700', letterSpacing: 2, color: COLORS.grey, marginBottom: 8 },

  codeCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FFF', borderRadius: RADIUS,
    paddingHorizontal: 16, paddingVertical: 14, marginBottom: 16, ...SHADOW,
  },
  codeInput: { flex: 1, fontFamily: FONT, fontSize: 18, fontWeight: '700', color: COLORS.black, padding: 0, letterSpacing: 1 },
  codeCount: { fontFamily: FONT, fontSize: 11, fontWeight: '700', color: COLORS.grey },

  previewCard: {
    backgroundColor: COLORS.black, borderRadius: 14,
    padding: 14, marginBottom: 16, alignItems: 'center',
  },
  previewLabel: { fontFamily: FONT, fontSize: 9, fontWeight: '700', letterSpacing: 2, color: 'rgba(255,255,255,0.6)', marginBottom: 6 },
  previewCode:  { fontFamily: FONT, fontSize: 16, fontWeight: '800', color: '#22A55B', letterSpacing: 0.5, textAlign: 'center' },

  cta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#1A7F4B', borderRadius: 16, paddingVertical: 16, ...SHADOW,
  },
  ctaDisabled: { backgroundColor: '#BBBBBB' },
  ctaTxt: { fontFamily: FONT, fontSize: 15, fontWeight: '800', color: '#FFF', letterSpacing: 0.3 },
});
