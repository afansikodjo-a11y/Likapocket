import { useState, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Platform, KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft, FileText, Eye, EyeOff, AlertCircle,
  Zap, Droplet, Tv, Wifi,
} from 'lucide-react-native';
import { getService } from '../../data/servicesTG';
import { getBillService } from '../../data/billServices';
import { dialUSSD, resolveUSSD } from '../../services/ussdHelper';
import { detectOperator } from '../../services/operatorDetection';
import { useEffect } from 'react';
import { COLORS, FONT, SPACE } from '../../theme';

const ICONS = { zap: Zap, droplet: Droplet, tv: Tv, wifi: Wifi };

export default function BillActionScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { serviceId, billTypeOverride } = route.params;
  const service = getService(serviceId);
  // billTypeOverride (depuis BillGroupScreen) prend le pas sur service.billType
  const billType = billTypeOverride ?? service?.billType;
  const bill = billType ? getBillService(billType) : null;

  const [ref,    setRef]    = useState('');
  const [amount, setAmount] = useState('');
  const [pin,    setPin]    = useState('');
  const [showPin, setShowPin] = useState(false);
  const [operator, setOperator] = useState(null);

  useEffect(() => {
    detectOperator().then(setOperator);
  }, []);

  if (!bill) {
    return <View style={s.root}><Text style={{ padding: 20 }}>Service introuvable.</Text></View>;
  }

  const Icon = ICONS[bill.icon] ?? FileText;

  // Choisir le template USSD selon l'opérateur détecté (yas par défaut)
  const opKey = operator?.id === 'moov' ? 'moov' : 'yas';
  const config = bill[opKey];

  const amt = parseInt((amount || '').replace(/\D/g, ''), 10) || 0;

  const previewUSSD = useMemo(() => {
    return resolveUSSD(config.ussdTemplate, {
      pin:    pin    || 'PIN',
      ref:    ref    || 'RÉFÉRENCE',
      amount: amt > 0 ? amt : 'MONTANT',
    });
  }, [config.ussdTemplate, pin, ref, amt]);

  const isValid =
    ref.length >= 4 &&
    amt > 0 &&
    pin.length >= 4;

  const handleSend = () => {
    if (!isValid) return;
    const code = resolveUSSD(config.ussdTemplate, {
      pin, ref, amount: amt,
    });
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
          <Text style={s.headerTitle}>{bill.label}</Text>
          <View style={{ width: 40 }} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={[bill.color, _darken(bill.color)]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.hero}
        >
          <View style={s.heroIcon}>
            <Icon size={22} color="#FFF" strokeWidth={2.2} />
          </View>
          <Text style={s.heroOver}>FACTURE</Text>
          <Text style={s.heroTitle}>{bill.label}</Text>
          <Text style={s.heroSub}>{bill.description}</Text>
          {operator?.id !== 'unknown' && (
            <View style={s.opBadge}>
              <Text style={s.opTxt}>Paiement via {operator?.label}</Text>
            </View>
          )}
        </LinearGradient>

        <View style={s.form}>
          <Text style={s.fieldLabel}>{bill.refLabel.toUpperCase()}</Text>
          <View style={s.inputCard}>
            <TextInput
              style={s.input}
              value={ref}
              onChangeText={(t) => setRef(t.replace(/[^a-zA-Z0-9]/g, '').slice(0, bill.refMaxLength ?? 20))}
              placeholder={bill.refPlaceholder ?? '—'}
              placeholderTextColor="#C9C9C9"
              keyboardType="default"
              autoCapitalize="characters"
              maxLength={bill.refMaxLength ?? 20}
            />
          </View>

          <Text style={s.fieldLabel}>MONTANT (F CFA)</Text>
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
            <Text style={s.amountCur}>F</Text>
          </View>

          <Text style={s.fieldLabel}>CODE SECRET MOBILE MONEY</Text>
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

          {config.needsValidation && (
            <View style={s.warnBox}>
              <AlertCircle size={14} color={COLORS.warning} strokeWidth={2.4} />
              <Text style={s.warnTxt}>
                Format USSD à valider. Teste avec un petit montant d'abord.
              </Text>
            </View>
          )}

          <View style={s.previewCard}>
            <Text style={s.previewLabel}>CODE USSD QUI SERA COMPOSÉ</Text>
            <Text style={s.previewCode} numberOfLines={2}>{previewUSSD}</Text>
          </View>

          <TouchableOpacity
            style={[s.cta, !isValid && s.ctaDisabled, { backgroundColor: isValid ? bill.color : '#BBBBBB' }]}
            onPress={handleSend}
            disabled={!isValid}
            activeOpacity={0.88}
          >
            <FileText size={17} color="#FFF" strokeWidth={2.4} />
            <Text style={s.ctaTxt}>
              {amt > 0 ? `Payer ${amt.toLocaleString('fr-FR')} F` : 'Payer'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function _darken(hex) {
  const c = hex.replace('#', '');
  const r = Math.max(0, parseInt(c.slice(0, 2), 16) - 30);
  const g = Math.max(0, parseInt(c.slice(2, 4), 16) - 30);
  const b = Math.max(0, parseInt(c.slice(4, 6), 16) - 30);
  return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
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
  headerTitle: { fontFamily: FONT, fontSize: 15, fontWeight: '800', color: COLORS.black },

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
  opBadge: {
    alignSelf: 'flex-start', marginTop: 12,
    backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  opTxt: { fontFamily: FONT, fontSize: 10, fontWeight: '700', color: '#FFF', letterSpacing: 0.5 },

  form: { paddingHorizontal: SPACE.lg },
  fieldLabel: { fontFamily: FONT, fontSize: 10, fontWeight: '700', letterSpacing: 2, color: COLORS.grey, marginBottom: 8, marginTop: 4 },

  inputCard: {
    backgroundColor: '#FFF', borderRadius: RADIUS,
    paddingHorizontal: 16, paddingVertical: Platform.OS === 'ios' ? 16 : 12,
    marginBottom: 16, ...SHADOW,
  },
  input: { fontFamily: FONT, fontSize: 15, fontWeight: '600', color: COLORS.black, padding: 0, letterSpacing: 0.5 },

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

  warnBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: COLORS.warningSoft, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10, marginBottom: 16,
  },
  warnTxt: { flex: 1, fontFamily: FONT, fontSize: 11, color: COLORS.warning, fontWeight: '600', lineHeight: 16 },

  previewCard: {
    backgroundColor: COLORS.black, borderRadius: 14,
    padding: 14, marginBottom: 16, alignItems: 'center',
  },
  previewLabel: { fontFamily: FONT, fontSize: 9, fontWeight: '700', letterSpacing: 2, color: 'rgba(255,255,255,0.6)', marginBottom: 6 },
  previewCode:  { fontFamily: FONT, fontSize: 15, fontWeight: '800', color: COLORS.gold, letterSpacing: 0.5, textAlign: 'center' },

  cta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: 16, paddingVertical: 16, ...SHADOW,
  },
  ctaDisabled: { backgroundColor: '#BBBBBB' },
  ctaTxt: { fontFamily: FONT, fontSize: 15, fontWeight: '800', color: '#FFF', letterSpacing: 0.3 },
});
