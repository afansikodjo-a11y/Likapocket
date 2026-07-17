import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft, User, Phone, Globe, Bell, Shield,
  Lock, HelpCircle, FileText, LogOut, ChevronRight,
  Wallet, Store, ArrowUpFromLine, ShieldCheck,
} from 'lucide-react-native';
import useAppStore from '../store/useAppStore';
import { signOut, supabase } from '../services/supabase';
import { getSecureValue } from '../database';
import {
  isPinSet, disablePin,
  isBiometricAvailable, isBiometricEnabled, setBiometricEnabled, getBiometricLabel,
} from '../services/pinService';
import SecurityPrompt from '../components/SecurityPrompt';
import EditFieldModal from '../components/EditFieldModal';
import { isAdmin } from '../services/authRole';
import { findCountry } from '../data/countries';
import { COLORS, FONT, SPACE } from '../theme';

// ── Labels ────────────────────────────────────────────────────────────────

const LANG_LABEL = {
  fr: '🇫🇷 Français',
  en: '🇬🇧 English',
};

// ── Row item ───────────────────────────────────────────────────────────────

function Row({ icon: Icon, iconColor, iconBg, label, value, onPress, danger }) {
  return (
    <TouchableOpacity style={s.row} onPress={onPress} activeOpacity={0.7} disabled={!onPress}>
      <View style={[s.rowIcon, { backgroundColor: iconBg ?? COLORS.greySoft }]}>
        <Icon size={16} color={iconColor ?? COLORS.grey} strokeWidth={2.2} />
      </View>
      <View style={s.rowBody}>
        <Text style={[s.rowLabel, danger && { color: COLORS.error }]}>{label}</Text>
        {value && <Text style={s.rowValue} numberOfLines={1}>{value}</Text>}
      </View>
      {onPress && !danger && <ChevronRight size={16} color="#CCC" strokeWidth={2.2} />}
    </TouchableOpacity>
  );
}

// ── Section ────────────────────────────────────────────────────────────────

function Section({ title, children }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{title}</Text>
      <View style={s.sectionCard}>{children}</View>
    </View>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────

export default function ProfileScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const session     = useAppStore((s) => s.session);
  const balance     = useAppStore((s) => s.balance);
  const pending     = useAppStore((s) => s.pendingCount);

  const [merchantId, setMerchantId] = useState(null);
  const [signingOut, setSigningOut] = useState(false);

  // ── Profile metadata (full_name, phone_number, country, language, notifications) ──
  const meta = session?.user?.user_metadata ?? {};
  const fullName     = meta.full_name     ?? '';
  const phoneNumber  = meta.phone_number  ?? '';
  const countryCode  = meta.country       ?? '';
  const language     = meta.language      ?? 'fr';
  const notifsOn     = meta.notifications !== false; // default true

  const country = findCountry(countryCode);

  // ── Re-auth pour les actions sensibles ──
  const [pendingAction, setPendingAction] = useState(null);   // { label, run }
  const [editField,     setEditField]     = useState(null);   // { type, key, title, label, initialValue, choices }
  const [savingMeta,    setSavingMeta]    = useState(false);

  const requireAuth = (label, run) => setPendingAction({ label, run });
  const onAuthSuccess = () => {
    const action = pendingAction;
    setPendingAction(null);
    if (action?.run) action.run();
  };

  // ── Save user metadata into Supabase Auth ─────────────────────────────────
  const saveMetadata = async (key, value) => {
    setSavingMeta(true);
    try {
      const { data, error } = await supabase.auth.updateUser({
        data: { ...meta, [key]: value },
      });
      if (error) throw new Error(error.message);
      // Update local store so UI reflects immediately
      if (data?.user) {
        useAppStore.setState((st) => ({ session: { ...st.session, user: data.user } }));
      }
    } finally {
      setSavingMeta(false);
    }
  };

  // PIN & biométrie
  const [pinEnabled, setPinEnabled]     = useState(false);
  const [bioAvail,   setBioAvail]       = useState(false);
  const [bioOn,      setBioOn]          = useState(false);
  const [bioLabel,   setBioLabel]       = useState('Biométrie');

  const refreshSecurity = async () => {
    const [pin, avail, on, label] = await Promise.all([
      isPinSet(),
      isBiometricAvailable(),
      isBiometricEnabled(),
      getBiometricLabel(),
    ]);
    setPinEnabled(pin);
    setBioAvail(avail);
    setBioOn(on && pin);
    setBioLabel(label);
  };

  useEffect(() => {
    getSecureValue('merchant_id').then(setMerchantId).catch(() => {});
    refreshSecurity();
    const unsub = navigation.addListener('focus', refreshSecurity);
    return unsub;
  }, [navigation]);

  const handlePinToggle = () => {
    if (!pinEnabled) {
      navigation.navigate('Pin', { mode: 'setup' });
    } else {
      Alert.alert(
        'Désactiver le code PIN ?',
        'Ton compte ne sera plus protégé par un code à l\'ouverture.',
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Désactiver',
            style: 'destructive',
            onPress: async () => {
              await disablePin();
              await refreshSecurity();
            },
          },
        ],
      );
    }
  };

  const handleChangePin = () => navigation.navigate('Pin', { mode: 'change' });

  const handleBioToggle = async () => {
    if (!pinEnabled) {
      Alert.alert('Code PIN requis', 'Active d\'abord ton code PIN pour utiliser la biométrie.');
      return;
    }
    const next = !bioOn;
    await setBiometricEnabled(next);
    setBioOn(next);
  };

  const email   = session?.user?.email ?? '—';
  const initial = email.charAt(0).toUpperCase();

  const handleSignOut = () => {
    Alert.alert(
      'Déconnexion',
      'Tu vas être déconnecté. Tes transactions locales restent enregistrées.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Se déconnecter',
          style: 'destructive',
          onPress: async () => {
            setSigningOut(true);
            try { await signOut(); } finally { setSigningOut(false); }
          },
        },
      ],
    );
  };

  const notImplemented = () => Alert.alert('Bientôt', 'Cette fonctionnalité arrive prochainement.');

  // ── Edit profile field (requires PIN auth, then opens EditFieldModal) ────
  const editProfileField = (config) => {
    requireAuth(`Modifier ${config.title.toLowerCase()}`, () => setEditField(config));
  };

  const handleEditName = () => editProfileField({
    type: 'text', key: 'full_name',
    title: 'Nom complet', label: 'NOM COMPLET',
    placeholder: 'Ex. Mariam Diallo',
    initialValue: fullName,
  });

  const handleEditPhone = () => editProfileField({
    type: 'phone', key: 'phone_number',
    title: 'Numéro de téléphone', label: 'NUMÉRO',
    placeholder: '+221 77 ...',
    initialValue: phoneNumber,
  });

  const handleEditCountry = () => editProfileField({
    type: 'country', key: 'country',
    title: 'Pays', label: 'PAYS',
    initialValue: countryCode,
  });

  // ── Preferences (no PIN required) ────────────────────────────────────────
  const handleEditLanguage = () => setEditField({
    type: 'choices', key: 'language',
    title: 'Langue', label: 'CHOISIR UNE LANGUE',
    initialValue: language,
    choices: [
      { value: 'fr', label: 'Français', sub: 'Langue par défaut', emoji: '🇫🇷' },
      { value: 'en', label: 'English',  sub: 'Anglais',           emoji: '🇬🇧' },
    ],
  });

  const handleToggleNotifs = async () => {
    try {
      await saveMetadata('notifications', !notifsOn);
    } catch (e) {
      Alert.alert('Erreur', e.message);
    }
  };

  // ── Navigation to other tabs/screens ─────────────────────────────────────
  const handleRecharger = () => {
    navigation.goBack(); // ferme Profile
    navigation.navigate('Transfer', { type: 'topup' });
  };
  const handleRelevé = () => {
    navigation.goBack();
    navigation.navigate('Tabs', { screen: 'History' });
  };

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* ── Header bar ── */}
      <View style={s.headerBar}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <ArrowLeft size={20} color={COLORS.black} strokeWidth={2.2} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Mon profil</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Identity card ── */}
        <LinearGradient
          colors={['#D69E4E', '#B5822D']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.identityCard}
        >
          <View style={s.avatar}>
            <Text style={s.avatarTxt}>{initial}</Text>
          </View>
          <Text style={s.identityEmail}>{email}</Text>
          <View style={s.identityStats}>
            <View style={s.statItem}>
              <Text style={s.statValue}>{balance?.toLocaleString('fr-FR') ?? '—'}</Text>
              <Text style={s.statLabel}>Solde (F)</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.statItem}>
              <Text style={s.statValue}>{pending}</Text>
              <Text style={s.statLabel}>En attente</Text>
            </View>
          </View>
        </LinearGradient>

        {/* ── Account ── */}
        <Section title="COMPTE">
          <Row icon={User}  iconColor={COLORS.gold}    iconBg={COLORS.goldSoft}    label="Nom complet"  value={fullName || 'Non renseigné'} onPress={handleEditName} />
          <Divider />
          <Row icon={Phone} iconColor={COLORS.success} iconBg={COLORS.successSoft} label="Téléphone"    value={phoneNumber || 'Non renseigné'} onPress={handleEditPhone} />
          <Divider />
          <Row icon={Globe} iconColor="#7C3AED"        iconBg="#EDE9FE"            label="Pays"         value={country ? `${country.flag}  ${country.label}` : 'Non renseigné'} onPress={handleEditCountry} />
          {merchantId && (
            <>
              <Divider />
              <Row icon={Store} iconColor={COLORS.gold} iconBg={COLORS.goldSoft} label="ID Marchand" value={merchantId} />
            </>
          )}
        </Section>

        {/* ── Admin (visible uniquement si role=admin) ── */}
        {isAdmin(session) && (
          <Section title="ADMINISTRATION">
            <Row
              icon={ShieldCheck}
              iconColor={COLORS.gold}
              iconBg={COLORS.goldSoft}
              label="Console admin"
              value="Valider les recharges Mobile Money"
              onPress={() => navigation.navigate('Admin')}
            />
          </Section>
        )}

        {/* ── Wallet ── */}
        <Section title="PORTEFEUILLE">
          <Row icon={Wallet}  iconColor={COLORS.gold} iconBg={COLORS.goldSoft} label="Recharger le compte" onPress={handleRecharger} />
          <Divider />
          <Row icon={ArrowUpFromLine} iconColor={COLORS.success} iconBg={COLORS.successSoft} label="Retirer vers Mobile Money" onPress={() => { navigation.goBack(); navigation.navigate('Transfer', { type: 'withdraw' }); }} />
          <Divider />
          <Row icon={FileText} iconColor={COLORS.grey} iconBg={COLORS.greySoft} label="Relevé d'opérations" onPress={handleRelevé} />
        </Section>

        {/* ── Security ── */}
        <Section title="SÉCURITÉ">
          <Row
            icon={Lock} iconColor={COLORS.error} iconBg={COLORS.errorSoft}
            label="Code PIN"
            value={pinEnabled ? 'Activé' : 'Désactivé'}
            onPress={handlePinToggle}
          />
          {pinEnabled && (
            <>
              <Divider />
              <Row
                icon={Lock} iconColor={COLORS.gold} iconBg={COLORS.goldSoft}
                label="Changer mon code PIN"
                onPress={handleChangePin}
              />
            </>
          )}
          {bioAvail && (
            <>
              <Divider />
              <Row
                icon={Shield} iconColor={COLORS.success} iconBg={COLORS.successSoft}
                label={bioLabel}
                value={bioOn ? 'Activée' : 'Désactivée'}
                onPress={handleBioToggle}
              />
            </>
          )}
        </Section>

        {/* ── Preferences ── */}
        <Section title="PRÉFÉRENCES">
          <Row icon={Bell}  iconColor={COLORS.warning} iconBg={COLORS.warningSoft} label="Notifications" value={notifsOn ? 'Activées' : 'Désactivées'} onPress={handleToggleNotifs} />
          <Divider />
          <Row icon={Globe} iconColor={COLORS.grey}    iconBg={COLORS.greySoft}    label="Langue"        value={LANG_LABEL[language] ?? 'Français'} onPress={handleEditLanguage} />
        </Section>

        {/* ── Support ── */}
        <Section title="ASSISTANCE">
          <Row icon={HelpCircle} iconColor="#7C3AED" iconBg="#EDE9FE" label="Centre d'aide"        onPress={() => navigation.navigate('Help')} />
          <Divider />
          <Row icon={FileText}   iconColor={COLORS.grey} iconBg={COLORS.greySoft} label="Conditions d'utilisation" onPress={() => navigation.navigate('Terms')} />
        </Section>

        {/* ── Sign out ── */}
        <View style={s.signoutWrap}>
          <TouchableOpacity style={s.signoutBtn} onPress={handleSignOut} disabled={signingOut} activeOpacity={0.85}>
            {signingOut
              ? <ActivityIndicator color={COLORS.error} />
              : <>
                  <LogOut size={16} color={COLORS.error} strokeWidth={2.2} />
                  <Text style={s.signoutTxt}>Se déconnecter</Text>
                </>}
          </TouchableOpacity>
          <Text style={s.versionTxt}>LikaPocket · v1.0.0</Text>
        </View>
      </ScrollView>

      <SecurityPrompt
        visible={!!pendingAction}
        reason={pendingAction?.label ?? "Confirmer l'opération"}
        onSuccess={onAuthSuccess}
        onCancel={() => setPendingAction(null)}
      />

      <EditFieldModal
        visible={!!editField}
        title={editField?.title}
        label={editField?.label}
        type={editField?.type}
        placeholder={editField?.placeholder}
        initialValue={editField?.initialValue}
        choices={editField?.choices}
        onSave={async (newValue) => {
          await saveMetadata(editField.key, newValue);
        }}
        onClose={() => setEditField(null)}
      />
    </View>
  );
}

function Divider() {
  return <View style={s.divider} />;
}

// ── Styles ─────────────────────────────────────────────────────────────────

const RADIUS = 20;
const SHADOW = Platform.select({
  ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 10 },
  default: { elevation: 2 },
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

  // Identity card
  identityCard: {
    marginHorizontal: SPACE.lg, marginTop: 8, marginBottom: 24,
    borderRadius: RADIUS, padding: 24, alignItems: 'center', ...SHADOW,
  },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)',
  },
  avatarTxt:     { fontFamily: FONT, fontSize: 32, fontWeight: '800', color: '#FFF' },
  identityEmail: { fontFamily: FONT, fontSize: 14, fontWeight: '600', color: '#FFF', marginBottom: 16 },
  identityStats: {
    flexDirection: 'row', alignItems: 'center', gap: 24,
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 14,
    paddingHorizontal: 20, paddingVertical: 12,
  },
  statItem:    { alignItems: 'center' },
  statValue:   { fontFamily: FONT, fontSize: 16, fontWeight: '800', color: '#FFF', letterSpacing: -0.3 },
  statLabel:   { fontFamily: FONT, fontSize: 10, color: 'rgba(255,255,255,0.75)', fontWeight: '600', letterSpacing: 0.5, marginTop: 2 },
  statDivider: { width: 1, height: 24, backgroundColor: 'rgba(255,255,255,0.25)' },

  // Sections
  section:     { marginHorizontal: SPACE.lg, marginBottom: 20 },
  sectionTitle:{ fontFamily: FONT, fontSize: 10, fontWeight: '700', letterSpacing: 2, color: COLORS.grey, marginBottom: 10, marginLeft: 4 },
  sectionCard: { backgroundColor: '#FFF', borderRadius: RADIUS, ...SHADOW },

  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 14, gap: 12 },
  rowIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rowBody: { flex: 1 },
  rowLabel:{ fontFamily: FONT, fontSize: 13, fontWeight: '600', color: COLORS.black },
  rowValue:{ fontFamily: FONT, fontSize: 11, color: COLORS.grey, marginTop: 2 },
  divider: { height: 1, backgroundColor: '#F4F4F4', marginLeft: 60 },

  // Sign out
  signoutWrap: { paddingHorizontal: SPACE.lg, marginTop: 8, alignItems: 'center' },
  signoutBtn: {
    width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.errorSoft, borderRadius: 14, paddingVertical: 14, gap: 8,
  },
  signoutTxt: { fontFamily: FONT, fontSize: 14, fontWeight: '700', color: COLORS.error, letterSpacing: 0.3 },
  versionTxt: { fontFamily: FONT, fontSize: 11, color: COLORS.greyLight, marginTop: 16, letterSpacing: 0.5 },
});
