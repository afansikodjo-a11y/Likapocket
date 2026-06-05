import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ActivityIndicator, ScrollView, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  KeyRound, Eye, EyeOff, AlertCircle,
  CheckCircle2, ArrowRight, LogOut,
} from 'lucide-react-native';
import { supabase } from '../services/supabase';
import { COLORS, FONT, SPACE } from '../theme';

function PasswordField({ label, value, onChangeText, placeholder }) {
  const [visible, setVisible] = useState(false);
  return (
    <View style={s.field}>
      <Text style={s.fieldLabel}>{label}</Text>
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
    </View>
  );
}

export default function ResetPasswordScreen({ onDone }) {
  const insets = useSafeAreaInsets();
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [success,  setSuccess]  = useState(false);

  const handleSubmit = async () => {
    setError('');
    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    setLoading(true);
    try {
      const { error: e } = await supabase.auth.updateUser({ password });
      if (e) throw new Error(e.message);
      setSuccess(true);
    } catch (e) {
      setError(e?.message ?? 'Erreur lors de la mise à jour du mot de passe.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = async () => {
    try { await supabase.auth.signOut(); } catch {}
    onDone?.();
  };

  return (
    <KeyboardAvoidingView
      style={s.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
    >
      <ScrollView
        contentContainerStyle={[s.container, { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 120 }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
      >
        {/* Brand */}
        <View style={s.brand}>
          <LinearGradient
            colors={['#D69E4E', '#B5822D']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.logoWrap}
          >
            <KeyRound size={32} color="#FFF" strokeWidth={2} />
          </LinearGradient>
          <Text style={s.brandName}>
            <Text style={s.brandLika}>Lika</Text>
            <Text style={s.brandPocket}>Pocket</Text>
          </Text>
          <Text style={s.brandTagline}>Réinitialisation du mot de passe</Text>
        </View>

        {/* Card */}
        <View style={s.card}>
          {!success ? (
            <>
              <Text style={s.title}>Nouveau mot de passe</Text>
              <Text style={s.subtitle}>
                Choisis un mot de passe d'au moins 6 caractères. Il remplacera celui que tu as oublié.
              </Text>

              <PasswordField
                label="NOUVEAU MOT DE PASSE"
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
              />
              <PasswordField
                label="CONFIRMER LE MOT DE PASSE"
                value={confirm}
                onChangeText={setConfirm}
                placeholder="••••••••"
              />

              {error ? (
                <View style={s.errorRow}>
                  <AlertCircle size={14} color={COLORS.error} strokeWidth={2.5} />
                  <Text style={s.errorTxt}>{error}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                style={[s.cta, loading && s.ctaDisabled]}
                onPress={handleSubmit}
                disabled={loading}
                activeOpacity={0.88}
              >
                {loading
                  ? <ActivityIndicator color="#FFF" />
                  : <>
                      <Text style={s.ctaTxt}>Enregistrer le mot de passe</Text>
                      <ArrowRight size={17} color="#FFF" strokeWidth={2.4} />
                    </>}
              </TouchableOpacity>

              <TouchableOpacity onPress={handleClose} style={s.cancelBtn} activeOpacity={0.7}>
                <LogOut size={14} color={COLORS.grey} strokeWidth={2.2} />
                <Text style={s.cancelTxt}>Annuler et se déconnecter</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={s.successIcon}>
                <CheckCircle2 size={40} color={COLORS.success} strokeWidth={2} />
              </View>
              <Text style={s.successTitle}>Mot de passe modifié</Text>
              <Text style={s.subtitle}>
                Tu peux maintenant te connecter avec ton nouveau mot de passe.
              </Text>
              <TouchableOpacity
                style={s.cta}
                onPress={handleClose}
                activeOpacity={0.88}
              >
                <Text style={s.ctaTxt}>Aller à la connexion</Text>
                <ArrowRight size={17} color="#FFF" strokeWidth={2.4} />
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

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
  container: { flexGrow: 1, paddingHorizontal: SPACE.lg, justifyContent: 'center' },

  brand: { alignItems: 'center', marginBottom: 24 },
  logoWrap: {
    width: 64, height: 64, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16, ...SHADOW,
  },
  brandName:    { fontFamily: FONT, fontSize: 24, fontWeight: '800', letterSpacing: -0.5, marginBottom: 4 },
  brandLika:    { color: COLORS.gold },
  brandPocket:  { color: COLORS.black },
  brandTagline: { fontFamily: FONT, fontSize: 12, color: COLORS.grey, letterSpacing: 0.5 },

  card: { backgroundColor: '#FFF', borderRadius: 20, padding: 22, ...SHADOW },

  title:    { fontFamily: FONT, fontSize: 20, fontWeight: '800', color: COLORS.black, letterSpacing: -0.3, marginBottom: 8 },
  subtitle: { fontFamily: FONT, fontSize: 13, color: COLORS.grey, lineHeight: 19, marginBottom: 20 },

  field:      { marginBottom: 14 },
  fieldLabel: { fontFamily: FONT, fontSize: 10, fontWeight: '700', letterSpacing: 1.5, color: COLORS.grey, marginBottom: 7 },
  inputBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.bg, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    borderWidth: 1, borderColor: '#EEEEEE',
  },
  input: { flex: 1, fontFamily: FONT, fontSize: 15, color: COLORS.black, padding: 0 },

  errorRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.errorSoft, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12,
  },
  errorTxt: { flex: 1, fontFamily: FONT, fontSize: 12, color: COLORS.error, fontWeight: '500' },

  cta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.black, borderRadius: 14, paddingVertical: 15, marginTop: 8,
    ...SHADOW_SOFT,
  },
  ctaDisabled: { backgroundColor: '#BBBBBB' },
  ctaTxt:      { fontFamily: FONT, fontSize: 15, fontWeight: '700', color: '#FFF', letterSpacing: 0.3 },

  cancelBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 14, marginTop: 4,
  },
  cancelTxt: { fontFamily: FONT, fontSize: 12, fontWeight: '600', color: COLORS.grey },

  successIcon: {
    alignSelf: 'center',
    width: 72, height: 72, borderRadius: 24,
    backgroundColor: COLORS.successSoft,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontFamily: FONT, fontSize: 20, fontWeight: '800',
    color: COLORS.success, textAlign: 'center',
    letterSpacing: -0.3, marginBottom: 8,
  },
});
