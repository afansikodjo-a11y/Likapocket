import { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ActivityIndicator, ScrollView, Modal, FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Wallet, Mail, Phone, Eye, EyeOff,
  AlertCircle, ChevronDown, Check, ArrowRight,
  X, CheckCircle2, KeyRound,
} from 'lucide-react-native';
import { signIn, signUp, sendPhoneOTP, verifyPhoneOTP, resetPassword, signInWithGoogle } from '../services/supabase';
import { COUNTRIES } from '../data/countries';
import { COLORS, FONT, SPACE } from '../theme';

// ── Sub-components ─────────────────────────────────────────────────────────

function MethodToggle({ method, onChange }) {
  return (
    <View style={s.methodRow}>
      {[
        { key: 'email', label: 'E-mail',    Icon: Mail  },
        { key: 'phone', label: 'Téléphone', Icon: Phone },
      ].map(({ key, label, Icon }) => {
        const on = method === key;
        return (
          <TouchableOpacity
            key={key}
            style={[s.methodBtn, on && s.methodBtnActive]}
            onPress={() => onChange(key)}
            activeOpacity={0.85}
          >
            <Icon size={15} color={on ? COLORS.gold : COLORS.grey} strokeWidth={2.2} />
            <Text style={[s.methodTxt, on && s.methodTxtActive]}>{label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function ModeTab({ mode, onChange }) {
  return (
    <View style={s.tabs}>
      {['connexion', 'inscription'].map((m) => {
        const on = mode === m;
        return (
          <TouchableOpacity
            key={m}
            style={[s.tab, on && s.tabActive]}
            onPress={() => onChange(m)}
            activeOpacity={0.85}
          >
            <Text style={[s.tabTxt, on && s.tabTxtActive]}>
              {m === 'connexion' ? 'Connexion' : 'Inscription'}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function Field({ label, children }) {
  return (
    <View style={s.field}>
      <Text style={s.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

function PasswordField({ label, value, onChangeText, placeholder }) {
  const [visible, setVisible] = useState(false);
  return (
    <Field label={label}>
      <View style={s.inputBox}>
        <TextInput
          style={s.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#C9C9C9"
          secureTextEntry={!visible}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity onPress={() => setVisible((v) => !v)} hitSlop={8}>
          {visible
            ? <EyeOff size={17} color={COLORS.grey} strokeWidth={2} />
            : <Eye    size={17} color={COLORS.grey} strokeWidth={2} />}
        </TouchableOpacity>
      </View>
    </Field>
  );
}

function CountryPicker({ selected, onSelect }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <TouchableOpacity style={s.countryBtn} onPress={() => setOpen(true)} activeOpacity={0.85}>
        <Text style={s.countryFlag}>{selected.flag}</Text>
        <Text style={s.countryDial}>{selected.dial}</Text>
        <ChevronDown size={14} color={COLORS.grey} strokeWidth={2.5} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide">
        <View style={s.modalBackdrop}>
          <View style={s.countrySheet}>
            <View style={s.sheetHandle} />
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>Choisir un pays</Text>
              <TouchableOpacity onPress={() => setOpen(false)} hitSlop={10}>
                <X size={18} color={COLORS.grey} strokeWidth={2.2} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={COUNTRIES}
              keyExtractor={(c) => c.code}
              renderItem={({ item }) => {
                const on = selected.code === item.code;
                return (
                  <TouchableOpacity
                    style={[s.countryRow, on && s.countryRowActive]}
                    onPress={() => { onSelect(item); setOpen(false); }}
                    activeOpacity={0.7}
                  >
                    <Text style={s.countryRowFlag}>{item.flag}</Text>
                    <View style={s.countryRowBody}>
                      <Text style={s.countryRowName}>{item.label}</Text>
                      <Text style={s.countryRowZone}>{item.zone === 'XOF' ? 'Franc CFA · UEMOA' : 'Franc CFA · CEMAC'}</Text>
                    </View>
                    <Text style={s.countryRowDial}>{item.dial}</Text>
                    {on && <Check size={16} color={COLORS.gold} strokeWidth={2.5} />}
                  </TouchableOpacity>
                );
              }}
              ItemSeparatorComponent={() => <View style={s.countrySep} />}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

function OtpField({ value, onChangeText }) {
  return (
    <Field label="CODE OTP (6 CHIFFRES)">
      <View style={s.inputBox}>
        <TextInput
          style={[s.input, s.otpInput]}
          value={value}
          onChangeText={(t) => onChangeText(t.replace(/\D/g, '').slice(0, 6))}
          placeholder="••••••"
          placeholderTextColor="#D9D9D9"
          keyboardType="number-pad"
          maxLength={6}
          autoFocus
        />
      </View>
    </Field>
  );
}

function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <View style={s.errorRow}>
      <AlertCircle size={14} color={COLORS.error} strokeWidth={2.5} />
      <Text style={s.errorTxt}>{message}</Text>
    </View>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────

export default function AuthScreen() {
  const insets = useSafeAreaInsets();

  const [method,   setMethod]   = useState('email');
  const [mode,     setMode]     = useState('connexion');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [country,  setCountry]  = useState(COUNTRIES[0]);
  const [phone,    setPhone]    = useState('');
  const [otp,      setOtp]      = useState('');
  const [otpSent,  setOtpSent]  = useState(false);
  const [resendCd, setResendCd] = useState(0);
  const [loading,  setLoading]  = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error,    setError]    = useState('');

  // Reset password
  const [resetOpen,    setResetOpen]    = useState(false);
  const [resetEmail,   setResetEmail]   = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSent,    setResetSent]    = useState(false);
  const [resetError,   setResetError]   = useState('');

  const cdRef = useRef(null);

  const handleOpenReset = () => {
    setResetEmail(email || '');
    setResetError('');
    setResetSent(false);
    setResetOpen(true);
  };

  const handleSendReset = async () => {
    setResetError('');
    if (!resetEmail.trim() || !/\S+@\S+\.\S+/.test(resetEmail)) {
      setResetError('Adresse e-mail invalide.');
      return;
    }
    setResetLoading(true);
    try {
      await resetPassword(resetEmail.trim());
      setResetSent(true);
    } catch (e) {
      setResetError(_friendlyError(e.message));
    } finally {
      setResetLoading(false);
    }
  };

  const reset = (m) => {
    setMethod(m);
    setError(''); setOtpSent(false); setOtp(''); setPhone('');
    setEmail(''); setPassword(''); setConfirm('');
    clearInterval(cdRef.current);
    setResendCd(0);
  };

  const startCountdown = () => {
    setResendCd(60);
    clearInterval(cdRef.current);
    cdRef.current = setInterval(() => {
      setResendCd((c) => {
        if (c <= 1) { clearInterval(cdRef.current); return 0; }
        return c - 1;
      });
    }, 1000);
  };

  const phoneE164 = () => `${country.dial}${phone.replace(/^0/, '')}`;

  const handleSendOTP = async () => {
    if (!phone.trim()) { setError('Entrez votre numéro de téléphone.'); return; }
    if (phone.replace(/\D/g, '').length < 8) { setError('Numéro trop court.'); return; }
    setError(''); setLoading(true);
    try {
      await sendPhoneOTP(phoneE164());
      setOtpSent(true);
      startCountdown();
    } catch (e) {
      setError(_friendlyError(e.message));
    } finally { setLoading(false); }
  };

  const handleVerifyOTP = async () => {
    if (otp.length < 6) { setError('Entrez le code à 6 chiffres.'); return; }
    setError(''); setLoading(true);
    try {
      await verifyPhoneOTP(phoneE164(), otp);
    } catch (e) {
      setError(_friendlyError(e.message));
    } finally { setLoading(false); }
  };

  const handleEmailSubmit = async () => {
    const err = _validateEmail(email, password, confirm, mode);
    if (err) { setError(err); return; }
    setError(''); setLoading(true);
    try {
      if (mode === 'connexion') await signIn(email.trim(), password);
      else                       await signUp(email.trim(), password);
    } catch (e) {
      setError(_friendlyError(e.message));
    } finally { setLoading(false); }
  };

  const handleGoogle = async () => {
    setError(''); setGoogleLoading(true);
    try {
      await signInWithGoogle();
      // Succès → onAuthStateChange (AppNavigator) bascule l'app automatiquement.
      // Annulation par l'utilisateur → on retombe ici sans erreur.
    } catch (e) {
      setError(_friendlyError(e.message));
    } finally {
      setGoogleLoading(false);
    }
  };

  const submitLabel = method === 'email'
    ? (mode === 'connexion' ? 'Se connecter' : 'Créer mon compte')
    : (otpSent ? 'Vérifier le code' : 'Recevoir le code SMS');

  const submitAction = method === 'email'
    ? handleEmailSubmit
    : (otpSent ? handleVerifyOTP : handleSendOTP);

  const submitDisabled = loading || (method === 'phone' && otpSent && otp.length < 6);

  return (
    <KeyboardAvoidingView
      style={s.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
    >
      <ScrollView
        contentContainerStyle={[
          s.container,
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 120 },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Brand ── */}
        <View style={s.brand}>
          <LinearGradient
            colors={['#D69E4E', '#B5822D']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.logoWrap}
          >
            <Wallet size={32} color="#FFF" strokeWidth={2} />
          </LinearGradient>
          <Text style={s.brandName}>
            <Text style={s.brandLika}>Lika</Text>
            <Text style={s.brandPocket}>Pocket</Text>
          </Text>
          <Text style={s.brandTagline}>Reliquats · Paiements offline</Text>
        </View>

        {/* ── Auth card ── */}
        <View style={s.card}>
          <MethodToggle method={method} onChange={reset} />

          {/* ═══ EMAIL FLOW ═══ */}
          {method === 'email' && (
            <>
              <ModeTab mode={mode} onChange={(m) => { setMode(m); setError(''); }} />

              <Field label="ADRESSE E-MAIL">
                <View style={s.inputBox}>
                  <TextInput
                    style={s.input}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="vous@exemple.com"
                    placeholderTextColor="#C9C9C9"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </Field>

              <PasswordField
                label="MOT DE PASSE"
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
              />

              {mode === 'inscription' && (
                <PasswordField
                  label="CONFIRMER LE MOT DE PASSE"
                  value={confirm}
                  onChangeText={setConfirm}
                  placeholder="••••••••"
                />
              )}

              {mode === 'connexion' && (
                <TouchableOpacity onPress={handleOpenReset} hitSlop={6} style={s.forgotBtn}>
                  <Text style={s.forgotTxt}>Mot de passe oublié ?</Text>
                </TouchableOpacity>
              )}
            </>
          )}

          {/* ═══ PHONE — NUMBER STEP ═══ */}
          {method === 'phone' && !otpSent && (
            <>
              <View style={s.phoneHintBox}>
                <Phone size={14} color={COLORS.gold} strokeWidth={2.2} />
                <Text style={s.phoneHint}>
                  Vous recevrez un code à 6 chiffres par SMS.
                </Text>
              </View>

              <Field label="NUMÉRO DE TÉLÉPHONE">
                <View style={s.phoneRow}>
                  <CountryPicker selected={country} onSelect={setCountry} />
                  <View style={[s.inputBox, { flex: 1 }]}>
                    <TextInput
                      style={s.input}
                      value={phone}
                      onChangeText={(t) => setPhone(t.replace(/\D/g, ''))}
                      placeholder="77 123 45 67"
                      placeholderTextColor="#C9C9C9"
                      keyboardType="phone-pad"
                    />
                  </View>
                </View>
              </Field>
            </>
          )}

          {/* ═══ PHONE — OTP STEP ═══ */}
          {method === 'phone' && otpSent && (
            <>
              <View style={s.otpHeader}>
                <Text style={s.otpSentTxt} numberOfLines={1}>
                  Code envoyé au {country.flag} {phoneE164()}
                </Text>
                <TouchableOpacity onPress={() => { setOtpSent(false); setOtp(''); setError(''); }} hitSlop={8}>
                  <Text style={s.otpChangeTxt}>Modifier</Text>
                </TouchableOpacity>
              </View>
              <OtpField value={otp} onChangeText={setOtp} />
            </>
          )}

          <ErrorBanner message={error} />

          {/* CTA */}
          <TouchableOpacity
            style={[s.cta, submitDisabled && s.ctaDisabled]}
            onPress={submitAction}
            disabled={submitDisabled}
            activeOpacity={0.88}
          >
            {loading
              ? <ActivityIndicator color="#FFF" />
              : <>
                  <Text style={s.ctaTxt}>{submitLabel}</Text>
                  <ArrowRight size={17} color="#FFF" strokeWidth={2.4} />
                </>}
          </TouchableOpacity>

          {/* Resend */}
          {method === 'phone' && otpSent && (
            <TouchableOpacity
              style={s.resendBtn}
              onPress={resendCd === 0 ? handleSendOTP : undefined}
              disabled={resendCd > 0}
            >
              <Text style={[s.resendTxt, resendCd > 0 && s.resendDisabled]}>
                {resendCd > 0 ? `Renvoyer dans ${resendCd}s` : 'Renvoyer le code'}
              </Text>
            </TouchableOpacity>
          )}

          {/* ═══ Séparateur + Google ═══ */}
          <View style={s.dividerRow}>
            <View style={s.dividerLine} />
            <Text style={s.dividerTxt}>ou</Text>
            <View style={s.dividerLine} />
          </View>

          <TouchableOpacity
            style={[s.googleBtn, googleLoading && s.ctaDisabled]}
            onPress={handleGoogle}
            disabled={googleLoading || loading}
            activeOpacity={0.85}
          >
            {googleLoading
              ? <ActivityIndicator color={COLORS.gold} />
              : <>
                  <Text style={s.googleG}>G</Text>
                  <Text style={s.googleTxt}>Continuer avec Google</Text>
                </>}
          </TouchableOpacity>
        </View>

        <Text style={s.footerNote}>
          En continuant, vous acceptez les conditions d'utilisation de LikaPocket.
        </Text>
      </ScrollView>

      {/* ── Modal "Mot de passe oublié" ── */}
      <Modal visible={resetOpen} transparent animationType="slide" onRequestClose={() => setResetOpen(false)}>
        <View style={s.modalBackdrop}>
          <View style={s.resetSheet}>
            <View style={s.sheetHandle} />

            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>Mot de passe oublié</Text>
              <TouchableOpacity onPress={() => setResetOpen(false)} hitSlop={10}>
                <X size={18} color={COLORS.grey} strokeWidth={2.2} />
              </TouchableOpacity>
            </View>

            {!resetSent ? (
              <>
                <View style={s.resetIcon}>
                  <KeyRound size={28} color={COLORS.gold} strokeWidth={2} />
                </View>
                <Text style={s.resetSubtitle}>
                  Saisis ton adresse e-mail. Nous t'enverrons un lien pour réinitialiser ton mot de passe.
                </Text>

                <View style={[s.inputBox, { marginHorizontal: SPACE.lg, marginBottom: 12 }]}>
                  <TextInput
                    style={s.input}
                    value={resetEmail}
                    onChangeText={setResetEmail}
                    placeholder="vous@exemple.com"
                    placeholderTextColor="#C9C9C9"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoFocus
                  />
                </View>

                {resetError ? (
                  <View style={[s.errorRow, { marginHorizontal: SPACE.lg }]}>
                    <AlertCircle size={14} color={COLORS.error} strokeWidth={2.5} />
                    <Text style={s.errorTxt}>{resetError}</Text>
                  </View>
                ) : null}

                <View style={{ paddingHorizontal: SPACE.lg, paddingBottom: insets.bottom + 16 }}>
                  <TouchableOpacity
                    style={[s.cta, resetLoading && s.ctaDisabled]}
                    onPress={handleSendReset}
                    disabled={resetLoading}
                    activeOpacity={0.88}
                  >
                    {resetLoading
                      ? <ActivityIndicator color="#FFF" />
                      : <>
                          <Text style={s.ctaTxt}>Envoyer le lien</Text>
                          <ArrowRight size={17} color="#FFF" strokeWidth={2.4} />
                        </>}
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <View style={s.resetIconSuccess}>
                  <CheckCircle2 size={32} color={COLORS.success} strokeWidth={2} />
                </View>
                <Text style={s.resetSuccessTitle}>E-mail envoyé !</Text>
                <Text style={s.resetSubtitle}>
                  Si {resetEmail} existe, tu recevras un lien de réinitialisation d'ici quelques minutes. Vérifie tes spams si besoin.
                </Text>
                <View style={{ paddingHorizontal: SPACE.lg, paddingBottom: insets.bottom + 16, marginTop: 16 }}>
                  <TouchableOpacity
                    style={s.cta}
                    onPress={() => setResetOpen(false)}
                    activeOpacity={0.88}
                  >
                    <Text style={s.ctaTxt}>Fermer</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

// ── Validators ─────────────────────────────────────────────────────────────

function _validateEmail(email, password, confirm, mode) {
  if (!email.trim())               return 'Veuillez entrer votre adresse e-mail.';
  if (!/\S+@\S+\.\S+/.test(email)) return 'Adresse e-mail invalide.';
  if (!password)                   return 'Veuillez entrer un mot de passe.';
  if (password.length < 6)         return 'Mot de passe trop court (min. 6 caractères).';
  if (mode === 'inscription' && password !== confirm)
                                   return 'Les mots de passe ne correspondent pas.';
  return null;
}

function _friendlyError(msg) {
  if (msg.includes('Invalid login'))        return 'Email ou mot de passe incorrect.';
  if (msg.includes('Email not confirmed'))  return 'Confirmez votre adresse e-mail avant de vous connecter.';
  if (msg.includes('already registered'))   return 'Un compte existe déjà avec cet email.';
  if (msg.includes('Password should'))      return 'Le mot de passe doit contenir au moins 6 caractères.';
  if (msg.includes('Token has expired'))    return 'Code expiré. Demandez un nouveau code.';
  if (msg.includes('Token is invalid'))     return 'Code incorrect. Vérifiez et réessayez.';
  if (msg.includes('Unsupported phone'))    return 'Indicatif non supporté par le provider SMS.';
  if (msg.includes('rate limit'))           return 'Trop de tentatives. Attendez quelques minutes.';
  if (msg.includes('only request this after')) {
    const secs = msg.match(/\d+/)?.[0];
    return secs ? `Patientez ${secs} secondes avant de réessayer.` : 'Patientez avant de réessayer.';
  }
  if (msg.includes('Database error'))       return 'Erreur serveur. Réessayez dans un instant.';
  return msg;
}

// ── Styles ─────────────────────────────────────────────────────────────────

const RADIUS = 20;
const SHADOW = Platform.select({
  ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 16 },
  default: { elevation: 4 },
});
const SHADOW_SOFT = Platform.select({
  ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6 },
  default: { elevation: 1 },
});

const s = StyleSheet.create({
  flex:      { flex: 1, backgroundColor: COLORS.bg },
  container: { flexGrow: 1, paddingHorizontal: SPACE.lg, justifyContent: 'flex-start' },

  // ── Brand block ──
  brand: { alignItems: 'center', marginBottom: 24 },
  logoWrap: {
    width: 64, height: 64, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16, ...SHADOW,
  },
  brandName:    { fontFamily: FONT, fontSize: 24, fontWeight: '800', letterSpacing: -0.5, marginBottom: 4 },
  brandLika:    { color: COLORS.gold },
  brandPocket:  { color: COLORS.black },
  brandTagline: { fontFamily: FONT, fontSize: 12, color: COLORS.grey, letterSpacing: 0.5 },

  // ── Card ──
  card: { backgroundColor: '#FFF', borderRadius: RADIUS, padding: 20, marginBottom: 16, ...SHADOW },

  // ── Method toggle ──
  methodRow: { flexDirection: 'row', backgroundColor: '#F4F4F4', borderRadius: 14, padding: 4, marginBottom: 16 },
  methodBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10, borderRadius: 10,
  },
  methodBtnActive: { backgroundColor: '#FFF', ...SHADOW_SOFT },
  methodTxt:       { fontFamily: FONT, fontSize: 13, fontWeight: '700', color: COLORS.grey },
  methodTxtActive: { color: COLORS.gold },

  // ── Mode tabs ──
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#F0F0F0', marginBottom: 16, marginTop: 2 },
  tab:  { flex: 1, alignItems: 'center', paddingVertical: 10 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: COLORS.gold, marginBottom: -1 },
  tabTxt:       { fontFamily: FONT, fontSize: 13, fontWeight: '600', color: COLORS.grey },
  tabTxtActive: { color: COLORS.gold, fontWeight: '700' },

  // ── Field ──
  field:      { marginBottom: 14 },
  fieldLabel: { fontFamily: FONT, fontSize: 10, fontWeight: '700', letterSpacing: 1.5, color: COLORS.grey, marginBottom: 7 },
  inputBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.bg, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    borderWidth: 1, borderColor: '#EEEEEE',
  },
  input:    { flex: 1, fontFamily: FONT, fontSize: 15, color: COLORS.black, padding: 0 },
  otpInput: { fontSize: 22, fontWeight: '700', letterSpacing: 8, textAlign: 'center' },

  // ── Phone row ──
  phoneRow:    { flexDirection: 'row', gap: 8 },
  countryBtn:  {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.bg, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    borderWidth: 1, borderColor: '#EEEEEE',
  },
  countryFlag: { fontSize: 17 },
  countryDial: { fontFamily: FONT, fontSize: 14, fontWeight: '700', color: COLORS.black },

  phoneHintBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.goldSoft, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10, marginBottom: 14, marginTop: 2,
  },
  phoneHint: { flex: 1, fontFamily: FONT, fontSize: 12, color: COLORS.gold, fontWeight: '600' },

  // ── OTP header ──
  otpHeader:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, marginTop: 2 },
  otpSentTxt:   { flex: 1, fontFamily: FONT, fontSize: 12, color: COLORS.grey, marginRight: 8 },
  otpChangeTxt: { fontFamily: FONT, fontSize: 12, fontWeight: '700', color: COLORS.gold },

  // ── Error banner ──
  errorRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.errorSoft, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10, marginTop: 4, marginBottom: 4,
  },
  errorTxt: { flex: 1, fontFamily: FONT, fontSize: 12, color: COLORS.error, fontWeight: '500' },

  // ── CTA ──
  cta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.black, borderRadius: 14, paddingVertical: 15, marginTop: 8,
    ...SHADOW_SOFT,
  },
  ctaDisabled: { backgroundColor: '#BBBBBB' },
  ctaTxt:      { fontFamily: FONT, fontSize: 15, fontWeight: '700', color: '#FFF', letterSpacing: 0.3 },

  resendBtn:     { alignItems: 'center', paddingVertical: 12, marginTop: 4 },
  resendTxt:     { fontFamily: FONT, fontSize: 13, fontWeight: '700', color: COLORS.gold },
  resendDisabled:{ color: COLORS.greyLight },

  // ── Séparateur "ou" ──
  dividerRow:  { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 18, marginBottom: 14 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#EDEDED' },
  dividerTxt:  { fontFamily: FONT, fontSize: 12, fontWeight: '600', color: COLORS.greyLight },

  // ── Bouton Google ──
  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: '#FFF', borderRadius: 14, paddingVertical: 14,
    borderWidth: 1, borderColor: '#E2E2E2', ...SHADOW_SOFT,
  },
  googleG:   { fontFamily: FONT, fontSize: 18, fontWeight: '800', color: '#4285F4' },
  googleTxt: { fontFamily: FONT, fontSize: 15, fontWeight: '700', color: COLORS.black, letterSpacing: 0.2 },

  // ── Forgot password link ──
  forgotBtn:  { alignSelf: 'flex-end', paddingVertical: 6, marginTop: -6, marginBottom: 4 },
  forgotTxt:  { fontFamily: FONT, fontSize: 12, fontWeight: '700', color: COLORS.gold },

  // ── Reset password sheet ──
  resetSheet: {
    backgroundColor: COLORS.bg,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingTop: 12, paddingBottom: 0, maxHeight: '85%',
  },
  resetIcon: {
    alignSelf: 'center',
    width: 64, height: 64, borderRadius: 20,
    backgroundColor: COLORS.goldSoft,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16, marginTop: 4,
  },
  resetIconSuccess: {
    alignSelf: 'center',
    width: 72, height: 72, borderRadius: 24,
    backgroundColor: COLORS.successSoft,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16, marginTop: 4,
  },
  resetSuccessTitle: {
    fontFamily: FONT, fontSize: 18, fontWeight: '800',
    color: COLORS.success, textAlign: 'center',
    letterSpacing: -0.3, marginBottom: 8,
  },
  resetSubtitle: {
    fontFamily: FONT, fontSize: 13, color: COLORS.grey,
    textAlign: 'center', lineHeight: 19,
    paddingHorizontal: SPACE.lg, marginBottom: 20,
  },

  // ── Footer ──
  footerNote: { fontFamily: FONT, fontSize: 11, color: COLORS.grey, textAlign: 'center', lineHeight: 16, paddingHorizontal: SPACE.md },

  // ── Country picker modal ──
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  countrySheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingTop: 12, paddingBottom: 24, maxHeight: '80%',
  },
  sheetHandle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: '#E0E0E0', marginBottom: 16 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACE.lg, marginBottom: 12 },
  sheetTitle:  { fontFamily: FONT, fontSize: 16, fontWeight: '800', color: COLORS.black },

  countryRow:       { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: SPACE.lg, paddingVertical: 12 },
  countryRowActive: { backgroundColor: COLORS.goldSoft },
  countryRowFlag:   { fontSize: 22 },
  countryRowBody:   { flex: 1 },
  countryRowName:   { fontFamily: FONT, fontSize: 14, fontWeight: '700', color: COLORS.black },
  countryRowZone:   { fontFamily: FONT, fontSize: 11, color: COLORS.grey, marginTop: 2 },
  countryRowDial:   { fontFamily: FONT, fontSize: 13, fontWeight: '700', color: COLORS.gold, letterSpacing: 0.3 },
  countrySep:       { height: 1, backgroundColor: '#F4F4F4', marginLeft: 60 },
});
