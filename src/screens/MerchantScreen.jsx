import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Platform, KeyboardAvoidingView,
  ActivityIndicator, Keyboard, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Store, Clock, RefreshCw, AlertCircle, QrCode,
} from 'lucide-react-native';
import { encryptQRPayload, QR_TTL_MS, MAX_QR_AMOUNT } from '../crypto/qrCrypto';
import {
  getSecureValue, saveSecureValue,
  debitForTransfer, cancelTransfer,
} from '../database';
import useAppStore from '../store/useAppStore';
import SecurityPrompt from '../components/SecurityPrompt';
import * as Crypto from 'expo-crypto';
import { COLORS, FONT, SPACE } from '../theme';

const TTL_SECONDS = Math.floor(QR_TTL_MS / 1000);

// ── Merchant ID — generated once, stored in secure enclave ─────────────────
async function loadOrCreateMerchantId() {
  let mid = await getSecureValue('merchant_id');
  if (!mid) {
    const bytes = await Crypto.getRandomBytesAsync(6);
    mid = 'MRC-' + Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
    await saveSecureValue('merchant_id', mid);
  }
  return mid;
}

// ── Component ──────────────────────────────────────────────────────────────
export default function MerchantScreen() {
  const insets = useSafeAreaInsets();
  const balance       = useAppStore((st) => st.balance);
  const refreshWallet = useAppStore((st) => st.refreshWallet);

  const [merchantId, setMerchantId] = useState(null);
  const [amountText, setAmountText] = useState('');
  const [qrValue,    setQrValue]    = useState(null);
  const [activeNonce, setActiveNonce] = useState(null);  // nonce du débit en cours
  const [timeLeft,   setTimeLeft]   = useState(TTL_SECONDS);
  const [generating, setGenerating] = useState(false);
  const [error,      setError]      = useState('');
  const [authPending, setAuthPending] = useState(false); // ouvre SecurityPrompt

  const timerRef    = useRef(null);
  const nonceRef    = useRef(null); // ref pour accès dans le timer

  useEffect(() => {
    loadOrCreateMerchantId().then(setMerchantId);
    refreshWallet();
    return () => clearInterval(timerRef.current);
  }, []);

  // Rollback automatique si l'écran est démonté avec un QR encore actif
  useEffect(() => {
    nonceRef.current = activeNonce;
  }, [activeNonce]);

  useEffect(() => {
    return () => {
      // À l'unmount, on annule le transfert non utilisé
      if (nonceRef.current) {
        cancelTransfer(nonceRef.current).catch(() => {});
      }
    };
  }, []);

  const startCountdown = useCallback((nonce) => {
    clearInterval(timerRef.current);
    setTimeLeft(TTL_SECONDS);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          // QR expiré sans avoir été scanné → rollback du débit
          cancelTransfer(nonce).then(() => refreshWallet()).catch(() => {});
          setActiveNonce(null);
          setQrValue(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [refreshWallet]);

  // Étape 1 : valider puis ouvrir le SecurityPrompt
  const handleGenerate = useCallback(() => {
    setError('');
    Keyboard.dismiss();
    const amount = parseFloat(amountText.replace(',', '.'));
    if (!isFinite(amount) || amount <= 0) {
      setError('Entrez un montant valide supérieur à 0.');
      return;
    }
    if (Math.round(amount) > MAX_QR_AMOUNT) {
      setError(`Montant maximum par QR : ${MAX_QR_AMOUNT.toLocaleString('fr-FR')} F.`);
      return;
    }
    if (balance === null) {
      setError('Solde non chargé. Réessayez dans un instant.');
      return;
    }
    if (balance < amount) {
      setError(`Solde insuffisant (${balance.toLocaleString('fr-FR')} F). Rechargez votre compte avant de générer un QR.`);
      return;
    }
    // Validation OK → on demande le PIN/biométrie
    setAuthPending(true);
  }, [amountText, balance]);

  // Étape 2 : appelée après authentification réussie
  const performGenerate = useCallback(async () => {
    setAuthPending(false);
    const amount = Math.round(parseFloat(amountText.replace(',', '.')));
    setGenerating(true);
    try {
      const { qr, nonce } = await encryptQRPayload({
        merchantId,
        merchantName: merchantId,
        amount,
        currency: 'CFA',
      });

      await debitForTransfer({
        amount,
        recipientId: 'qr',
        nonce,
      });

      setActiveNonce(nonce);
      setQrValue(qr);
      startCountdown(nonce);
      refreshWallet();
    } catch (e) {
      setError(e.message);
    } finally {
      setGenerating(false);
    }
  }, [amountText, merchantId, startCountdown, refreshWallet]);

  const handleReset = useCallback(async () => {
    clearInterval(timerRef.current);
    // Si un débit est encore en attente, on l'annule
    if (activeNonce) {
      await cancelTransfer(activeNonce).catch(() => {});
      refreshWallet();
    }
    setActiveNonce(null);
    setQrValue(null);
    setAmountText('');
    setTimeLeft(TTL_SECONDS);
    setError('');
  }, [activeNonce, refreshWallet]);

  // Timer color
  const timerColor = timeLeft > 60 ? COLORS.success : timeLeft > 20 ? COLORS.warning : COLORS.error;
  const minutes    = String(Math.floor(timeLeft / 60)).padStart(2, '0');
  const seconds    = String(timeLeft % 60).padStart(2, '0');
  const amount     = parseFloat(amountText.replace(',', '.'));

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* ── Header ── */}
      <View style={s.header}>
        <View>
          <Text style={s.overline}>PAYER UN RELIQUAT</Text>
          <Text style={s.title}>Mon QR Code</Text>
        </View>
        <View style={s.badge}>
          <Store size={12} color={COLORS.gold} strokeWidth={2.2} />
          <Text style={s.badgeTxt}>{merchantId ?? '…'}</Text>
        </View>
      </View>

      {/* ── Solde disponible ── */}
      <View style={s.balancePill}>
        <Text style={s.balanceLbl}>Solde disponible :</Text>
        <Text style={s.balanceVal}>
          {balance === null ? '—' : balance.toLocaleString('fr-FR')} F
        </Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
      >
        <ScrollView
          contentContainerStyle={{ paddingBottom: insets.bottom + 200, flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
        >
          {qrValue ? (
            /* ── QR card ───────────────────────────────────────────────── */
            <View style={s.section}>
              {/* Timer */}
              <View style={s.timerWrap}>
                <View style={[s.timerPill, { backgroundColor: timerColor + '15' }]}>
                  <Clock size={12} color={timerColor} strokeWidth={2.5} />
                  <Text style={[s.timerTxt, { color: timerColor }]}>
                    {timeLeft > 0 ? `Expire dans ${minutes}:${seconds}` : 'QR expiré'}
                  </Text>
                </View>
              </View>

              {/* QR card */}
              <View style={s.qrCard}>
                {timeLeft > 0 ? (
                  <QRCode
                    value={qrValue}
                    size={220}
                    color={COLORS.black}
                    backgroundColor={'#FFFFFF'}
                    quietZone={8}
                  />
                ) : (
                  <View style={s.expired}>
                    <AlertCircle size={32} color={COLORS.greyLight} strokeWidth={1.8} />
                    <Text style={s.expiredTxt}>EXPIRÉ</Text>
                  </View>
                )}
              </View>

              {/* Amount card */}
              <LinearGradient
                colors={['#D69E4E', '#B5822D']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={s.amtCard}
              >
                <Text style={s.amtLabel}>MONTANT À RECEVOIR</Text>
                <View style={s.amtRow}>
                  <Text style={s.amtValue}>{amount.toLocaleString('fr-FR')}</Text>
                  <Text style={s.amtCur}>F CFA</Text>
                </View>
              </LinearGradient>

              {/* Reset button */}
              <TouchableOpacity style={s.resetBtn} onPress={handleReset} activeOpacity={0.85}>
                <RefreshCw size={16} color={COLORS.gold} strokeWidth={2.2} />
                <Text style={s.resetTxt}>Nouveau QR</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* ── Form card ─────────────────────────────────────────────── */
            <View style={s.section}>
              <View style={s.formCard}>
                <Text style={s.fieldLabel}>MONTANT À DEMANDER</Text>
                <View style={s.amtInputRow}>
                  <TextInput
                    style={s.amtInput}
                    value={amountText}
                    onChangeText={setAmountText}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={'#D9D9D9'}
                    returnKeyType="done"
                    onSubmitEditing={handleGenerate}
                    maxLength={10}
                  />
                  <Text style={s.amtInputCur}>F CFA</Text>
                </View>

                {error ? (
                  <View style={s.errorBox}>
                    <AlertCircle size={14} color={COLORS.error} strokeWidth={2.2} />
                    <Text style={s.errorTxt}>{error}</Text>
                  </View>
                ) : null}
              </View>

              <TouchableOpacity
                style={[s.cta, (!amountText || generating) && s.ctaDisabled]}
                onPress={handleGenerate}
                disabled={!amountText || generating}
                activeOpacity={0.88}
              >
                {generating ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <QrCode size={18} color="#FFFFFF" strokeWidth={2.2} />
                    <Text style={s.ctaTxt}>Générer le QR Code</Text>
                  </>
                )}
              </TouchableOpacity>

              <Text style={s.hint}>
                Montant maximum : {MAX_QR_AMOUNT.toLocaleString('fr-FR')} F par QR.{'\n'}
                Le QR code expire après 2 minutes pour ta sécurité.
              </Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <SecurityPrompt
        visible={authPending}
        reason={`Confirmer l'envoi de ${Math.round(parseFloat(amountText.replace(',', '.')) || 0).toLocaleString('fr-FR')} F CFA`}
        onSuccess={performGenerate}
        onCancel={() => setAuthPending(false)}
      />
    </View>
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

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACE.lg, paddingVertical: 16,
  },
  overline: { fontFamily: FONT, fontSize: 10, fontWeight: '700', letterSpacing: 2, color: COLORS.grey, marginBottom: 4 },
  title:    { fontFamily: FONT, fontSize: 22, fontWeight: '800', color: COLORS.black, letterSpacing: -0.5 },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: COLORS.goldSoft, paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 12,
  },
  badgeTxt: { fontFamily: FONT, fontSize: 10, fontWeight: '700', color: COLORS.gold, letterSpacing: 0.5 },

  balancePill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start', marginHorizontal: SPACE.lg, marginTop: 4,
    paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: '#FFF', borderRadius: 12, ...SHADOW,
  },
  balanceLbl: { fontFamily: FONT, fontSize: 11, color: COLORS.grey, fontWeight: '500' },
  balanceVal: { fontFamily: FONT, fontSize: 12, color: COLORS.black, fontWeight: '800', letterSpacing: -0.3 },

  section: { paddingHorizontal: SPACE.lg, paddingTop: SPACE.md },

  // Form
  formCard: { backgroundColor: '#FFF', borderRadius: RADIUS, padding: 24, marginBottom: 16, ...SHADOW },
  fieldLabel: { fontFamily: FONT, fontSize: 10, fontWeight: '700', letterSpacing: 2, color: COLORS.grey, marginBottom: 12 },
  amtInputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, borderBottomWidth: 2, borderBottomColor: COLORS.gold, paddingBottom: 8 },
  amtInput: {
    flex: 1, fontFamily: FONT, fontSize: 44, fontWeight: '800',
    color: COLORS.black, letterSpacing: -2, padding: 0,
  },
  amtInputCur: { fontFamily: FONT, fontSize: 16, fontWeight: '600', color: COLORS.grey, marginBottom: 8 },

  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.errorSoft, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10, marginTop: 16,
  },
  errorTxt: { flex: 1, fontFamily: FONT, fontSize: 12, color: COLORS.error, fontWeight: '500' },

  // CTA
  cta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.black, paddingVertical: 16, borderRadius: 16, gap: 10,
    ...SHADOW,
  },
  ctaDisabled: { backgroundColor: '#BBBBBB' },
  ctaTxt: { fontFamily: FONT, fontSize: 15, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.3 },
  hint: { fontFamily: FONT, fontSize: 11, color: COLORS.grey, textAlign: 'center', marginTop: 16, lineHeight: 16 },

  // QR section
  timerWrap: { alignItems: 'center', marginBottom: 16 },
  timerPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 6, paddingHorizontal: 12, borderRadius: 12,
  },
  timerTxt: { fontFamily: FONT, fontSize: 12, fontWeight: '700' },

  qrCard: {
    backgroundColor: '#FFF', borderRadius: RADIUS,
    padding: 24, alignItems: 'center', marginBottom: 16, ...SHADOW,
  },
  expired: {
    width: 220, height: 220, alignItems: 'center', justifyContent: 'center', gap: 12,
    backgroundColor: '#FAFAFA', borderRadius: 12,
  },
  expiredTxt: { fontFamily: FONT, fontSize: 16, fontWeight: '800', color: COLORS.greyLight, letterSpacing: 3 },

  amtCard: { borderRadius: RADIUS, padding: 20, marginBottom: 16, ...SHADOW },
  amtLabel: { fontFamily: FONT, fontSize: 10, fontWeight: '700', letterSpacing: 2, color: 'rgba(255,255,255,0.75)', marginBottom: 6 },
  amtRow:   { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  amtValue: { fontFamily: FONT, fontSize: 32, fontWeight: '800', color: '#FFF', letterSpacing: -1 },
  amtCur:   { fontFamily: FONT, fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.75)' },

  resetBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#FFF', borderRadius: 16, paddingVertical: 14, ...SHADOW,
  },
  resetTxt: { fontFamily: FONT, fontSize: 14, fontWeight: '700', color: COLORS.gold },
});
