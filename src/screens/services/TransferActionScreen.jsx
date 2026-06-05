import { useState, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Platform, KeyboardAvoidingView, ActivityIndicator,
  Modal, FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft, Send, Users, AlertCircle, ChevronDown, X, Check,
  Eye, EyeOff,
} from 'lucide-react-native';
import { getService, OPERATORS } from '../../data/servicesTG';
import { COUNTRIES, findCountry } from '../../data/countries';
import { dialUSSD, resolveUSSD } from '../../services/ussdHelper';
import ContactsPickerModal from '../../components/ContactsPickerModal';
import useAppStore from '../../store/useAppStore';
import { COLORS, FONT, SPACE } from '../../theme';

export default function TransferActionScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { serviceId } = route.params;
  const service = getService(serviceId);

  const session     = useAppStore((s) => s.session);
  const userCountry = session?.user?.user_metadata?.country ?? 'TG';

  const [country,        setCountry]        = useState(findCountry(userCountry) ?? findCountry('TG'));
  const [showCountry,    setShowCountry]    = useState(false);
  const [showContacts,   setShowContacts]   = useState(false);
  const [showPin,        setShowPin]        = useState(false);

  const [phone,  setPhone]  = useState('');
  const [amount, setAmount] = useState('');
  const [pin,    setPin]    = useState('');

  if (!service) {
    return <View style={s.root}><Text style={{ padding: 20 }}>Service introuvable.</Text></View>;
  }

  const operator = OPERATORS[service.operator];

  // Numéro complet (sans le +) pour le USSD
  const localPhone = phone.replace(/\D/g, '').replace(/^0/, '');
  const fullPhone  = localPhone ? `${country.dial.replace('+', '')}${localPhone}` : '';

  const amt = parseInt((amount || '').replace(/\D/g, ''), 10) || 0;

  // USSD preview
  const previewUSSD = useMemo(() => {
    return resolveUSSD(service.ussdTemplate, {
      pin:    pin || 'PIN',
      phone:  fullPhone || 'NUMÉRO',
      amount: amt > 0 ? amt : 'MONTANT',
    });
  }, [service.ussdTemplate, pin, fullPhone, amt]);

  const isValid =
    localPhone.length >= 7 &&
    amt > 0 &&
    pin.length >= 4;

  const handleSend = () => {
    if (!isValid) return;
    const code = resolveUSSD(service.ussdTemplate, {
      pin, phone: fullPhone, amount: amt,
    });
    dialUSSD(code);
  };

  const handleContactPick = ({ phone: contactPhone }) => {
    // Si le numéro commence par +228 ou similaire, on enlève le préfixe pays
    // pour le mettre dans le sélecteur country
    const cleaned = contactPhone.replace(/\D/g, '');
    if (cleaned.startsWith('228')) {
      setCountry(findCountry('TG'));
      setPhone(cleaned.slice(3));
    } else if (cleaned.startsWith('221')) {
      setCountry(findCountry('SN'));
      setPhone(cleaned.slice(3));
    } else if (cleaned.startsWith('225')) {
      setCountry(findCountry('CI'));
      setPhone(cleaned.slice(3));
    } else {
      setPhone(cleaned);
    }
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
          <Text style={s.headerTitle}>Transfert</Text>
          <View style={{ width: 40 }} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
      >
        {/* Hero opérateur */}
        <LinearGradient
          colors={['#D69E4E', '#B5822D']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.hero}
        >
          <View style={s.heroIcon}>
            <Send size={22} color="#FFF" strokeWidth={2.2} />
          </View>
          <Text style={s.heroOver}>{operator?.label ?? 'TRANSFERT'}</Text>
          <Text style={s.heroTitle}>{service.label}</Text>
          <Text style={s.heroSub}>
            Saisis les infos. On compose le code USSD complet en 1 seul appel.
          </Text>
        </LinearGradient>

        {/* Form */}
        <View style={s.form}>
          {/* Destinataire */}
          <Text style={s.fieldLabel}>NUMÉRO DESTINATAIRE</Text>
          <View style={s.phoneCard}>
            <TouchableOpacity style={s.flagBtn} onPress={() => setShowCountry(true)} activeOpacity={0.7}>
              <Text style={s.flagEmoji}>{country.flag}</Text>
              <ChevronDown size={12} color={COLORS.grey} strokeWidth={2.5} />
            </TouchableOpacity>
            <View style={s.flagSep} />
            <TextInput
              style={s.input}
              value={phone}
              onChangeText={(t) => setPhone(t.replace(/\D/g, ''))}
              placeholder="77 123 45 67"
              placeholderTextColor="#C9C9C9"
              keyboardType="phone-pad"
              maxLength={15}
            />
            {Platform.OS !== 'web' && (
              <TouchableOpacity style={s.contactsBtn} onPress={() => setShowContacts(true)} activeOpacity={0.75}>
                <Users size={18} color={COLORS.gold} strokeWidth={2.4} />
              </TouchableOpacity>
            )}
          </View>

          {/* Montant */}
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

          {/* PIN */}
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

          {/* Warning needsValidation */}
          {service.needsValidation && (
            <View style={s.warnBox}>
              <AlertCircle size={14} color={COLORS.warning} strokeWidth={2.4} />
              <Text style={s.warnTxt}>
                Format USSD à valider — teste avec un petit montant (100 F) la 1re fois.
              </Text>
            </View>
          )}

          {/* Preview USSD */}
          <View style={s.previewCard}>
            <Text style={s.previewLabel}>CODE USSD QUI SERA COMPOSÉ</Text>
            <Text style={s.previewCode} numberOfLines={2}>{previewUSSD}</Text>
          </View>

          {/* CTA */}
          <TouchableOpacity
            style={[s.cta, !isValid && s.ctaDisabled]}
            onPress={handleSend}
            disabled={!isValid}
            activeOpacity={0.88}
          >
            <Send size={17} color="#FFF" strokeWidth={2.4} />
            <Text style={s.ctaTxt}>
              {amt > 0 ? `Envoyer ${amt.toLocaleString('fr-FR')} F` : 'Envoyer'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Country picker modal */}
      <Modal visible={showCountry} transparent animationType="slide" onRequestClose={() => setShowCountry(false)}>
        <View style={s.sheetBackdrop}>
          <View style={[s.sheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={s.sheetHandle} />
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>Choisir un pays</Text>
              <TouchableOpacity onPress={() => setShowCountry(false)} hitSlop={10} style={s.closeBtn}>
                <X size={18} color={COLORS.grey} strokeWidth={2.2} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={COUNTRIES}
              keyExtractor={(c) => c.code}
              style={{ maxHeight: 440 }}
              renderItem={({ item }) => {
                const on = country.code === item.code;
                return (
                  <TouchableOpacity
                    style={[s.cRow, on && s.cRowActive]}
                    onPress={() => { setCountry(item); setShowCountry(false); }}
                    activeOpacity={0.7}
                  >
                    <Text style={s.cFlag}>{item.flag}</Text>
                    <Text style={s.cName}>{item.label}</Text>
                    <Text style={s.cDial}>{item.dial}</Text>
                    {on && <Check size={16} color={COLORS.gold} strokeWidth={2.5} />}
                  </TouchableOpacity>
                );
              }}
              ItemSeparatorComponent={() => <View style={s.cSep} />}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      </Modal>

      {/* Contacts picker */}
      <ContactsPickerModal
        visible={showContacts}
        onClose={() => setShowContacts(false)}
        onSelect={handleContactPick}
      />
    </KeyboardAvoidingView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

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

  // Hero
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

  // Form
  form: { paddingHorizontal: SPACE.lg },
  fieldLabel: { fontFamily: FONT, fontSize: 10, fontWeight: '700', letterSpacing: 2, color: COLORS.grey, marginBottom: 8, marginTop: 4 },

  // Phone (drapeau + input + bouton contacts)
  phoneCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFF', borderRadius: RADIUS,
    paddingHorizontal: 4, paddingVertical: 6, marginBottom: 16, ...SHADOW,
  },
  flagBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  flagEmoji: { fontSize: 22 },
  flagSep:   { width: 1, height: 22, backgroundColor: '#EEE', marginRight: 10 },
  input:     { flex: 1, fontFamily: FONT, fontSize: 15, fontWeight: '600', color: COLORS.black, padding: 0, paddingVertical: 10 },
  contactsBtn: {
    width: 38, height: 38, borderRadius: 12, backgroundColor: COLORS.goldSoft,
    alignItems: 'center', justifyContent: 'center', marginRight: 6,
  },

  // Montant
  amountCard: {
    flexDirection: 'row', alignItems: 'baseline', gap: 8,
    backgroundColor: '#FFF', borderRadius: RADIUS,
    paddingHorizontal: 16, paddingVertical: 14, marginBottom: 16, ...SHADOW,
  },
  amountInput: { flex: 1, fontFamily: FONT, fontSize: 32, fontWeight: '800', color: COLORS.black, padding: 0, letterSpacing: -1 },
  amountCur:   { fontFamily: FONT, fontSize: 14, fontWeight: '700', color: COLORS.grey },

  // PIN
  pinCard: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FFF', borderRadius: RADIUS,
    paddingHorizontal: 16, paddingVertical: 12, marginBottom: 16, ...SHADOW,
  },
  pinInput: { flex: 1, fontFamily: FONT, fontSize: 20, fontWeight: '700', color: COLORS.black, padding: 0, letterSpacing: 8 },

  // Warning
  warnBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: COLORS.warningSoft, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10, marginBottom: 16,
  },
  warnTxt: { flex: 1, fontFamily: FONT, fontSize: 11, color: COLORS.warning, fontWeight: '600', lineHeight: 16 },

  // Preview USSD
  previewCard: {
    backgroundColor: COLORS.black, borderRadius: 14,
    padding: 14, marginBottom: 16, alignItems: 'center',
  },
  previewLabel: { fontFamily: FONT, fontSize: 9, fontWeight: '700', letterSpacing: 2, color: 'rgba(255,255,255,0.6)', marginBottom: 6 },
  previewCode:  { fontFamily: FONT, fontSize: 16, fontWeight: '800', color: COLORS.gold, letterSpacing: 0.5, textAlign: 'center' },

  // CTA
  cta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.gold, borderRadius: 16, paddingVertical: 16,
    ...SHADOW,
  },
  ctaDisabled: { backgroundColor: '#BBBBBB' },
  ctaTxt: { fontFamily: FONT, fontSize: 15, fontWeight: '800', color: '#FFF', letterSpacing: 0.3 },

  // Country picker modal
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: COLORS.bg,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingTop: 12, paddingHorizontal: SPACE.lg,
    maxHeight: '85%',
  },
  sheetHandle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: '#E0E0E0', marginBottom: 16 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sheetTitle:  { fontFamily: FONT, fontSize: 16, fontWeight: '800', color: COLORS.black },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: '#FFF',
    alignItems: 'center', justifyContent: 'center',
  },

  cRow:       { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 12, paddingVertical: 12, borderRadius: 12 },
  cRowActive: { backgroundColor: COLORS.goldSoft },
  cFlag:      { fontSize: 22 },
  cName:      { flex: 1, fontFamily: FONT, fontSize: 14, fontWeight: '700', color: COLORS.black },
  cDial:      { fontFamily: FONT, fontSize: 13, fontWeight: '700', color: COLORS.gold, letterSpacing: 0.3 },
  cSep:       { height: 1, backgroundColor: '#F4F4F4', marginLeft: 56 },
});
