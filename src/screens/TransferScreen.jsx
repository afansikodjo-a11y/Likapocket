import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, Modal, FlatList,
  StyleSheet, Platform, KeyboardAvoidingView, ActivityIndicator, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft, ArrowDownToLine, ArrowUpFromLine, Check,
  AlertCircle, Phone, CreditCard, CheckCircle2, Smartphone, Lock,
  Wallet, ChevronDown, X,
} from 'lucide-react-native';
import { initiateTopUp, initiateWithdraw, PROVIDERS } from '../services/PaymentProvider';
import { COUNTRIES, findCountry, zoneLabel } from '../data/countries';
import useAppStore from '../store/useAppStore';
import {
  openWhatsAppToAdmin, buildTopUpMessage, buildWithdrawMessage,
} from '../config/admin';
import { COLORS, FONT, SPACE } from '../theme';

// ── Method (top-level) ────────────────────────────────────────────────────

// Méthodes générées dynamiquement selon le type (topup / withdraw)
function buildMethods(isTopUp) {
  return [
    {
      id:      'internal',
      label:   isTopUp ? 'Recharge interne' : 'Retrait interne',
      sub:     "Validé par l'administrateur",
      icon:    Wallet,
      bg:      '#D69E4E',
      tint:    '#FBF3E4',
      enabled: true,
    },
    {
      id:      'mobile_money',
      label:   'Mobile Money',
      sub:     'Orange · Wave · Moov',
      icon:    Smartphone,
      bg:      '#1A7F4B',
      tint:    '#E6F4EE',
      enabled: false, // bientôt (Moneroo)
    },
    {
      id:      'card',
      label:   'Carte bancaire',
      sub:     'Visa · Mastercard',
      icon:    CreditCard,
      bg:      '#1A1A1A',
      tint:    '#E5E5E5',
      enabled: false, // bientôt
    },
  ];
}

// ── Method card ───────────────────────────────────────────────────────────

function MethodCard({ option, selected, onPress }) {
  const on = selected === option.id;
  const Icon = option.icon;
  return (
    <TouchableOpacity
      style={[
        s.methodCard,
        on && { borderColor: option.bg, borderWidth: 2 },
        !option.enabled && s.methodCardDisabled,
      ]}
      onPress={() => option.enabled && onPress(option.id)}
      activeOpacity={option.enabled ? 0.85 : 1}
      disabled={!option.enabled}
    >
      <View style={[s.methodLogo, { backgroundColor: option.tint }]}>
        <Icon size={22} color={option.bg} strokeWidth={2} />
      </View>
      <View style={s.methodBody}>
        <Text style={s.methodLabel}>{option.label}</Text>
        <Text style={s.methodSub} numberOfLines={1}>{option.sub}</Text>
      </View>
      {!option.enabled && (
        <View style={s.soonBadge}>
          <Lock size={9} color={COLORS.grey} strokeWidth={2.4} />
          <Text style={s.soonTxt}>BIENTÔT</Text>
        </View>
      )}
      {on && option.enabled && (
        <View style={[s.methodCheck, { backgroundColor: option.bg }]}>
          <Check size={11} color="#FFF" strokeWidth={3} />
        </View>
      )}
    </TouchableOpacity>
  );
}


// ── Main component ─────────────────────────────────────────────────────────

export default function TransferScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const refreshWallet = useAppStore((s) => s.refreshWallet);
  const balance = useAppStore((s) => s.balance);

  const type = route?.params?.type ?? 'topup'; // 'topup' | 'withdraw'
  const isTopUp = type === 'topup';

  // Méthode (Recharge interne / Mobile Money / Carte)
  // Pour l'instant seule "internal" est active. MoMo et Carte sont BIENTÔT.
  const [method,   setMethod]   = useState('internal');
  // Provider final envoyé à l'API (selon la méthode choisie)
  const [provider, setProvider] = useState(PROVIDERS.ORANGE_MONEY);
  const [amount,   setAmount]   = useState('');
  const [phone,    setPhone]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [success,  setSuccess]  = useState(false);
  const [requestId, setRequestId] = useState(null);

  const session    = useAppStore((s) => s.session);
  const userEmail  = session?.user?.email ?? '';
  const meta       = session?.user?.user_metadata ?? {};
  const userFullName  = meta.full_name   ?? null;
  const userMetaPhone = meta.phone_number ?? null;
  const userCountry   = meta.country     ?? null;

  // Pays du destinataire (par défaut : pays du profil, sinon premier de la liste)
  const [destCountry, setDestCountry] = useState(
    findCountry(userCountry) ?? COUNTRIES[0],
  );
  const [showCountryPicker, setShowCountryPicker] = useState(false);

  // Téléphone destinataire requis pour :
  //   • TOUS les retraits (où l'user veut recevoir son argent)
  //   • Les recharges Mobile Money (futur Moneroo)
  // Recharge interne = pas de numéro (admin définit le moyen via WhatsApp)
  const showPhone = !isTopUp || method === 'mobile_money';
  const amt = parseInt(amount.replace(/\D/g, ''), 10);
  const valid = amt > 0
    && (!showPhone || phone.replace(/\D/g, '').length >= 8)
    && (isTopUp || amt <= (balance ?? 0));

  // ── Theme adapted to type ──
  const heroGrad   = isTopUp ? ['#1A7F4B', '#22A55B'] : ['#D69E4E', '#B5822D'];
  const heroIcon   = isTopUp ? ArrowDownToLine : ArrowUpFromLine;
  const heroTitle  = isTopUp ? 'Recharger mon compte' : 'Retirer vers Mobile Money';
  const heroOver   = isTopUp ? 'PAY-IN' : 'PAY-OUT';
  const submitTxt  = isTopUp ? 'Confirmer la recharge' : 'Confirmer le retrait';
  const HeroIcon   = heroIcon;

  // ── Submit ──
  const handleSubmit = async () => {
    setError('');
    if (!valid) {
      if (isTopUp === false && amt > (balance ?? 0)) setError('Solde insuffisant.');
      else if (amt <= 0)                              setError('Entrez un montant valide.');
      else                                            setError('Numéro de téléphone trop court.');
      return;
    }

    setLoading(true);
    try {
      // Le "provider" qu'on envoie côté Supabase = la méthode si interne,
      // sinon l'opérateur précis (à venir avec Moneroo).
      const finalProvider = method === 'internal' ? 'internal' : provider;

      // Numéro complet au format E.164 : +<dial><local sans zéro initial>
      const fullPhone = showPhone
        ? `${destCountry.dial}${phone.replace(/^0/, '')}`
        : null;

      let result;
      if (isTopUp) {
        result = await initiateTopUp({ amount: amt, provider: finalProvider, phoneNumber: fullPhone });
      } else {
        result = await initiateWithdraw({ amount: amt, provider: finalProvider, phoneNumber: fullPhone });
      }
      setRequestId(result?.requestId ?? null);
      refreshWallet();
      setSuccess(true);
    } catch (e) {
      const msg = e.message ?? '';
      if (msg.includes('does not exist') || msg.includes('relation')) {
        setError('La table payment_requests n\'existe pas dans Supabase.');
      } else if (msg.includes('row-level security') || msg.includes('violates')) {
        setError('Permission refusée. Vérifie les policies RLS Supabase.');
      } else if (msg.includes('permission denied')) {
        setError('Permission refusée sur la table. Exécute le GRANT côté Supabase.');
      } else if (msg.includes('Auth') || msg.includes('JWT')) {
        setError('Session expirée. Reconnecte-toi.');
      } else if (msg.includes('check constraint') || msg.includes('violates check')) {
        setError(`Méthode "${method}" non autorisée par la contrainte SQL. Mets à jour le CHECK.`);
      } else {
        setError(msg || 'Erreur inconnue. Réessaie.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Success state ──
  if (success) {
    return (
      <View style={[s.root, { paddingTop: insets.top, paddingBottom: insets.bottom + 20 }]}>
        <View style={s.successWrap}>
          <LinearGradient
            colors={['#1A7F4B', '#22A55B']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.successMark}
          >
            <CheckCircle2 size={48} color="#FFF" strokeWidth={2} />
          </LinearGradient>
          <Text style={s.successTitle}>Demande envoyée</Text>
          <Text style={s.successBody}>
            {isTopUp
              ? `Ta demande de recharge de ${amt.toLocaleString('fr-FR')} F est enregistrée.\nPour finaliser le règlement, clique sur le bouton ci-dessous.`
              : `Ta demande de retrait de ${amt.toLocaleString('fr-FR')} F est en attente de validation par l'administrateur.\nPour préciser le moyen de réception, clique sur le bouton ci-dessous.`}
          </Text>

          {requestId && (
            <View style={s.refPill}>
              <Text style={s.refLabel}>RÉFÉRENCE</Text>
              <Text style={s.refValue}>#{String(requestId).slice(0, 8)}</Text>
            </View>
          )}

          {/* CTA WhatsApp style mockup : 2 bulles blanches + texte */}
          <TouchableOpacity
            style={s.waBtn}
            activeOpacity={0.88}
            onPress={() => {
              const common = {
                amount:    amt,
                requestId,
                fullName:  userFullName,
                userEmail,
                userPhone: userMetaPhone,
                country:   userCountry,
              };
              const message = isTopUp
                ? buildTopUpMessage(common)
                : buildWithdrawMessage({
                    ...common,
                    destination: `${destCountry.dial}${phone.replace(/^0/, '')}`,
                  });
              openWhatsAppToAdmin(message);
            }}
          >
            <View style={s.waBubble}>
              <Phone size={16} color="#25D366" strokeWidth={2.8} fill="#25D366" />
            </View>
            <Text style={s.waBtnTxt}>Cliquez ici pour continuer</Text>
            <View style={s.waBubble}>
              <Phone size={16} color="#25D366" strokeWidth={2.8} fill="#25D366" />
            </View>
          </TouchableOpacity>
        </View>

        <View style={s.successActions}>
          <TouchableOpacity style={s.doneBtn} onPress={() => navigation.goBack()} activeOpacity={0.88}>
            <Text style={s.doneBtnTxt}>Retour à l'accueil</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Main form ──
  return (
    <KeyboardAvoidingView
      style={s.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
    >
      <View style={[s.root, { paddingTop: insets.top }]}>
        {/* ── Header bar ── */}
        <View style={s.headerBar}>
          <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <ArrowLeft size={20} color={COLORS.black} strokeWidth={2.2} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>{isTopUp ? 'Recharger' : 'Retirer'}</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={{ paddingBottom: insets.bottom + 200 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Hero card ── */}
          <LinearGradient
            colors={heroGrad}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.hero}
          >
            <View style={s.heroIcon}>
              <HeroIcon size={22} color="#FFF" strokeWidth={2.2} />
            </View>
            <Text style={s.heroOver}>{heroOver}</Text>
            <Text style={s.heroTitle}>{heroTitle}</Text>
            {!isTopUp && (
              <Text style={s.heroBalance}>
                Solde disponible : <Text style={{ fontWeight: '800' }}>{balance?.toLocaleString('fr-FR') ?? '—'} F</Text>
              </Text>
            )}
          </LinearGradient>

          {/* ── Méthode de paiement ── */}
          <Text style={s.sectionTitle}>MÉTHODE DE PAIEMENT</Text>
          <View style={s.methodList}>
            {buildMethods(isTopUp).map((opt) => (
              <MethodCard key={opt.id} option={opt} selected={method} onPress={setMethod} />
            ))}
          </View>

          {/* ── Amount ── */}
          <Text style={s.sectionTitle}>MONTANT</Text>
          <View style={s.amtCard}>
            <View style={s.amtRow}>
              <TextInput
                style={s.amtInput}
                value={amount}
                onChangeText={(t) => setAmount(t.replace(/\D/g, ''))}
                placeholder="0"
                placeholderTextColor="#D9D9D9"
                keyboardType="numeric"
                maxLength={10}
              />
              <Text style={s.amtCur}>F CFA</Text>
            </View>
            {/* Quick amounts */}
            <View style={s.quickRow}>
              {[1000, 2500, 5000, 10000].map((n) => (
                <TouchableOpacity
                  key={n}
                  style={s.quickChip}
                  onPress={() => setAmount(String(n))}
                  activeOpacity={0.8}
                >
                  <Text style={s.quickTxt}>{n.toLocaleString('fr-FR')}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* ── Numéro (caché selon méthode) ── */}
          {showPhone && (
            <>
              <Text style={s.sectionTitle}>
                {isTopUp ? 'NUMÉRO À DÉBITER' : 'NUMÉRO DE RETRAIT'}
              </Text>
              <View style={s.phoneCard}>
                <TouchableOpacity
                  style={s.flagBtn}
                  onPress={() => setShowCountryPicker(true)}
                  activeOpacity={0.7}
                >
                  <Text style={s.flagEmoji}>{destCountry.flag}</Text>
                  <ChevronDown size={12} color={COLORS.grey} strokeWidth={2.5} />
                </TouchableOpacity>
                <View style={s.flagSeparator} />
                <TextInput
                  style={s.phoneInput}
                  value={phone}
                  onChangeText={(t) => setPhone(t.replace(/\D/g, ''))}
                  placeholder="77 123 45 67"
                  placeholderTextColor="#C9C9C9"
                  keyboardType="phone-pad"
                  maxLength={15}
                />
              </View>
            </>
          )}

          {/* ── Error ── */}
          {error ? (
            <View style={s.errorBox}>
              <AlertCircle size={14} color={COLORS.error} strokeWidth={2.2} />
              <Text style={s.errorTxt}>{error}</Text>
            </View>
          ) : null}

          {/* ── Submit ── */}
          <TouchableOpacity
            style={[s.cta, !valid && s.ctaDisabled]}
            onPress={handleSubmit}
            disabled={!valid || loading}
            activeOpacity={0.88}
          >
            {loading
              ? <ActivityIndicator color="#FFF" />
              : <Text style={s.ctaTxt}>{submitTxt}</Text>}
          </TouchableOpacity>

          <Text style={s.hint}>
            {isTopUp
              ? (method === 'internal'
                  ? "Ta demande sera examinée par l'administrateur. Tu recevras ton crédit dès validation."
                  : 'Tu recevras une notification sur ton téléphone pour valider la recharge.')
              : 'Les frais opérateur sont déduits par le fournisseur.'}
          </Text>
        </ScrollView>
      </View>

      {/* ── Country picker modal ── */}
      <Modal
        visible={showCountryPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCountryPicker(false)}
      >
        <View style={s.sheetBackdrop}>
          <View style={[s.sheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={s.sheetHandle} />
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>Choisir un pays</Text>
              <TouchableOpacity onPress={() => setShowCountryPicker(false)} hitSlop={10} style={s.sheetClose}>
                <X size={18} color={COLORS.grey} strokeWidth={2.2} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={COUNTRIES}
              keyExtractor={(c) => c.code}
              style={{ maxHeight: 480 }}
              renderItem={({ item }) => {
                const on = destCountry.code === item.code;
                return (
                  <TouchableOpacity
                    style={[s.cRow, on && s.cRowActive]}
                    onPress={() => {
                      setDestCountry(item);
                      setShowCountryPicker(false);
                    }}
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
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const RADIUS = 20;
const SHADOW = Platform.select({
  ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 10 },
  default: { elevation: 2 },
});

const s = StyleSheet.create({
  flex: { flex: 1 },
  root: { flex: 1, backgroundColor: COLORS.bg },

  // Header
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
    marginHorizontal: SPACE.lg, marginTop: 8, marginBottom: 24,
    padding: 20, borderRadius: RADIUS, ...SHADOW,
  },
  heroIcon: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  heroOver:   { fontFamily: FONT, fontSize: 10, fontWeight: '700', letterSpacing: 1.5, color: 'rgba(255,255,255,0.85)', marginBottom: 6 },
  heroTitle:  { fontFamily: FONT, fontSize: 22, fontWeight: '800', color: '#FFF', letterSpacing: -0.5, marginBottom: 8 },
  heroBalance:{ fontFamily: FONT, fontSize: 12, color: 'rgba(255,255,255,0.85)' },

  // Section title
  sectionTitle: {
    fontFamily: FONT, fontSize: 10, fontWeight: '700',
    letterSpacing: 2, color: COLORS.grey,
    marginHorizontal: SPACE.lg, marginBottom: 10, marginTop: 4,
  },

  // Method (top-level)
  methodList: { paddingHorizontal: SPACE.lg, marginBottom: 22, gap: 10 },
  methodCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#FFF', borderRadius: RADIUS, padding: 14,
    borderWidth: 2, borderColor: 'transparent', ...SHADOW,
  },
  methodCardDisabled: { opacity: 0.5 },
  methodLogo: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  methodBody: { flex: 1 },
  methodLabel:{ fontFamily: FONT, fontSize: 14, fontWeight: '700', color: COLORS.black },
  methodSub:  { fontFamily: FONT, fontSize: 11, color: COLORS.grey, marginTop: 2 },
  methodCheck:{
    width: 22, height: 22, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
  },
  soonBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.greySoft, borderRadius: 10,
    paddingHorizontal: 7, paddingVertical: 3,
  },
  soonTxt: { fontFamily: FONT, fontSize: 9, fontWeight: '700', letterSpacing: 1, color: COLORS.grey },

  // Operator pill
  opList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: SPACE.lg, marginBottom: 22 },
  opPill: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FFF', borderRadius: 14,
    paddingVertical: 8, paddingHorizontal: 12,
    borderWidth: 2, borderColor: 'transparent', ...SHADOW,
  },
  opLogo: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  opShort:{ fontFamily: FONT, fontSize: 9, fontWeight: '800', letterSpacing: 0.3 },
  opLabel:{ fontFamily: FONT, fontSize: 12, fontWeight: '700', color: COLORS.black },


  // Amount card
  amtCard: {
    backgroundColor: '#FFF', marginHorizontal: SPACE.lg, marginBottom: 22,
    borderRadius: RADIUS, padding: 18, ...SHADOW,
  },
  amtRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10,
    borderBottomWidth: 2, borderBottomColor: COLORS.gold, paddingBottom: 10, marginBottom: 14,
  },
  amtInput: { flex: 1, fontFamily: FONT, fontSize: 40, fontWeight: '800', color: COLORS.black, letterSpacing: -1.5, padding: 0 },
  amtCur:   { fontFamily: FONT, fontSize: 14, fontWeight: '600', color: COLORS.grey, marginBottom: 6 },

  quickRow: { flexDirection: 'row', gap: 8 },
  quickChip:{ flex: 1, backgroundColor: COLORS.bg, borderRadius: 10, paddingVertical: 8, alignItems: 'center' },
  quickTxt: { fontFamily: FONT, fontSize: 12, fontWeight: '700', color: COLORS.grey },

  // Phone card avec drapeau pays
  phoneCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFF', marginHorizontal: SPACE.lg, marginBottom: 22,
    borderRadius: RADIUS, paddingHorizontal: 4,
    paddingVertical: 6, ...SHADOW,
  },
  flagBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: Platform.OS === 'ios' ? 10 : 6,
  },
  flagEmoji:     { fontSize: 22 },
  flagSeparator: { width: 1, height: 22, backgroundColor: '#EEE', marginRight: 10 },
  phoneInput: {
    flex: 1, fontFamily: FONT, fontSize: 15, fontWeight: '600',
    color: COLORS.black, padding: 0,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
  },

  // Country picker bottom sheet
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
  sheetClose:  {
    width: 32, height: 32, borderRadius: 16, backgroundColor: '#FFF',
    alignItems: 'center', justifyContent: 'center',
  },

  // Country row dans la liste
  cRow:       { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 12, paddingVertical: 12, borderRadius: 12 },
  cRowActive: { backgroundColor: COLORS.goldSoft },
  cFlag:      { fontSize: 22 },
  cName:      { fontFamily: FONT, fontSize: 14, fontWeight: '700', color: COLORS.black },
  cZone:      { fontFamily: FONT, fontSize: 11, color: COLORS.grey, marginTop: 2 },
  cDial:      { fontFamily: FONT, fontSize: 13, fontWeight: '700', color: COLORS.gold, letterSpacing: 0.3 },
  cSep:       { height: 1, backgroundColor: '#F4F4F4', marginLeft: 56 },

  // Error
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.errorSoft, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10,
    marginHorizontal: SPACE.lg, marginBottom: 12,
  },
  errorTxt: { flex: 1, fontFamily: FONT, fontSize: 12, color: COLORS.error, fontWeight: '500' },

  // CTA
  cta: {
    marginHorizontal: SPACE.lg, backgroundColor: COLORS.black,
    borderRadius: 16, paddingVertical: 16, alignItems: 'center', ...SHADOW,
  },
  ctaDisabled: { backgroundColor: '#BBBBBB' },
  ctaTxt: { fontFamily: FONT, fontSize: 15, fontWeight: '700', color: '#FFF', letterSpacing: 0.3 },

  hint: { fontFamily: FONT, fontSize: 11, color: COLORS.grey, textAlign: 'center', marginTop: 16, lineHeight: 16, paddingHorizontal: SPACE.lg },

  // Success
  successWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACE.lg, paddingBottom: SPACE.md },
  successActions: { paddingHorizontal: SPACE.lg, gap: 10 },
  successMark: {
    width: 96, height: 96, borderRadius: 48,
    alignItems: 'center', justifyContent: 'center', marginBottom: 24, ...SHADOW,
  },
  successTitle: { fontFamily: FONT, fontSize: 26, fontWeight: '800', color: COLORS.black, marginBottom: 14, textAlign: 'center', letterSpacing: -0.5 },
  successBody:  { fontFamily: FONT, fontSize: 14, color: COLORS.grey, textAlign: 'center', lineHeight: 22, paddingHorizontal: SPACE.md },

  refPill: {
    marginTop: 18, alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.goldSoft, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  refLabel: { fontFamily: FONT, fontSize: 9, fontWeight: '700', letterSpacing: 1.5, color: COLORS.grey },
  refValue: { fontFamily: FONT, fontSize: 13, fontWeight: '800', color: COLORS.gold, letterSpacing: 0.5 },

  // WhatsApp CTA façon mockup : pill verte avec 2 bulles blanches
  waBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#25D366', borderRadius: 999,
    paddingHorizontal: 8, paddingVertical: 8,
    marginTop: 28, gap: 8,
    ...SHADOW,
  },
  waBubble: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#FFF',
    alignItems: 'center', justifyContent: 'center',
  },
  waBtnTxt: {
    flex: 1, textAlign: 'center',
    fontFamily: FONT, fontSize: 14, fontWeight: '700',
    color: '#FFF', letterSpacing: 0.3,
  },

  doneBtn: {
    backgroundColor: COLORS.bg, borderRadius: 16, paddingVertical: 14, alignItems: 'center',
    borderWidth: 1, borderColor: '#EEEEEE',
  },
  doneBtnTxt: { fontFamily: FONT, fontSize: 14, fontWeight: '700', color: COLORS.grey, letterSpacing: 0.3 },
});
