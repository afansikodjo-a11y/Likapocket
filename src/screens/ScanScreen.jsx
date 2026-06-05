import { useState, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Platform, Modal, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Camera, ScanLine, AlertCircle, CheckCircle2,
  XCircle, ArrowRight, RefreshCw,
} from 'lucide-react-native';
import { decryptQRPayload } from '../crypto/qrCrypto';
import { creditFromQR } from '../database';
import useAppStore from '../store/useAppStore';
import { COLORS, FONT, SPACE } from '../theme';

// ── States ─────────────────────────────────────────────────────────────────
const S = {
  SCANNING:   'SCANNING',
  CONFIRMING: 'CONFIRMING',
  PROCESSING: 'PROCESSING',
  SUCCESS:    'SUCCESS',
  ERROR:      'ERROR',
};

const WIN = 260;

// ── Component ──────────────────────────────────────────────────────────────
export default function ScanScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const refreshWallet = useAppStore((s) => s.refreshWallet);

  const [permission, requestPermission] = useCameraPermissions();
  const [screen,     setScreen]     = useState(S.SCANNING);
  const [payload,    setPayload]    = useState(null);
  const [newBalance, setNewBalance] = useState(null);
  const [errorMsg,   setErrorMsg]   = useState('');

  const processing = useRef(false);

  const handleScan = useCallback(({ data }) => {
    if (processing.current || screen !== S.SCANNING) return;
    processing.current = true;
    try {
      const p = decryptQRPayload(data);
      setPayload(p);
      setScreen(S.CONFIRMING);
    } catch (e) {
      setErrorMsg(e.message);
      setScreen(S.ERROR);
    }
  }, [screen]);

  const handleConfirm = useCallback(async () => {
    if (!payload) return;
    setScreen(S.PROCESSING);
    try {
      const balance = await creditFromQR({
        amount:       payload.amt,
        merchantId:   payload.mid,
        merchantName: payload.mname,
        nonce:        payload.nonce,
        currency:     payload.cur,
      });
      setNewBalance(balance);
      refreshWallet();
      setScreen(S.SUCCESS);
    } catch (e) {
      setErrorMsg(e.message);
      setScreen(S.ERROR);
    }
  }, [payload, refreshWallet]);

  const reset = useCallback(() => {
    processing.current = false;
    setPayload(null);
    setErrorMsg('');
    setScreen(S.SCANNING);
  }, []);

  // ── Permission loading ──────────────────────────────────────────────────
  if (!permission) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={COLORS.gold} />
      </View>
    );
  }

  // ── Permission denied ───────────────────────────────────────────────────
  if (!permission.granted) {
    return (
      <View style={[s.permRoot, { paddingTop: insets.top + SPACE.lg }]}>
        <View style={s.permCard}>
          <View style={s.permIcon}>
            <Camera size={32} color={COLORS.gold} strokeWidth={2} />
          </View>
          <Text style={s.permTitle}>Accès caméra requis</Text>
          <Text style={s.permBody}>
            LikaPocket a besoin de la caméra pour scanner les QR codes des marchands.
          </Text>
          <TouchableOpacity style={s.permBtn} onPress={requestPermission} activeOpacity={0.88}>
            <Text style={s.permBtnTxt}>Autoriser la caméra</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Success screen ─────────────────────────────────────────────────────
  if (screen === S.SUCCESS) {
    return (
      <View style={[s.successRoot, { paddingTop: insets.top, paddingBottom: insets.bottom + SPACE.lg }]}>
        <View style={s.successInner}>
          <LinearGradient
            colors={['#1A7F4B', '#22A55B']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.successMark}
          >
            <CheckCircle2 size={48} color="#FFF" strokeWidth={2} />
          </LinearGradient>

          <Text style={s.successTitle}>Reliquat reçu</Text>

          <View style={s.successAmtCard}>
            <Text style={s.successAmtOver}>MONTANT CRÉDITÉ</Text>
            <View style={s.successAmtRow}>
              <Text style={s.successAmt}>
                +{payload?.amt?.toLocaleString('fr-FR')}
              </Text>
              <Text style={s.successAmtCur}>F CFA</Text>
            </View>
            <View style={s.successDivider} />
            <View style={s.successBalRow}>
              <Text style={s.successBalLabel}>Nouveau solde</Text>
              <Text style={s.successBalValue}>
                {newBalance?.toLocaleString('fr-FR')} F
              </Text>
            </View>
          </View>

          <View style={s.syncBadge}>
            <RefreshCw size={11} color={COLORS.gold} strokeWidth={2.5} />
            <Text style={s.syncBadgeTxt}>En attente de synchronisation</Text>
          </View>
        </View>

        <TouchableOpacity
          style={s.doneBtn}
          onPress={() => { reset(); navigation.navigate('Home'); }}
          activeOpacity={0.88}
        >
          <Text style={s.doneBtnTxt}>Retour à l'accueil</Text>
          <ArrowRight size={18} color="#FFF" strokeWidth={2.2} />
        </TouchableOpacity>
      </View>
    );
  }

  // ── Main camera view ────────────────────────────────────────────────────
  return (
    <View style={StyleSheet.absoluteFill}>
      {screen === S.SCANNING && (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={handleScan}
        />
      )}

      {/* Overlay */}
      <View style={s.overlay} pointerEvents="none">
        <View style={s.overlayTop} />
        <View style={s.overlayMiddle}>
          <View style={s.overlaySide} />
          <View style={s.scanWindow}>
            <Corner pos="tl" /><Corner pos="tr" />
            <Corner pos="bl" /><Corner pos="br" />
          </View>
          <View style={s.overlaySide} />
        </View>
        <View style={s.overlayBottom} />
      </View>

      {/* Top header */}
      <View style={[s.topBar, { top: insets.top + 12 }]} pointerEvents="box-none">
        <View style={s.topPill}>
          <ScanLine size={14} color="#FFF" strokeWidth={2.2} />
          <Text style={s.topTxt}>Scanner un QR</Text>
        </View>
      </View>

      {/* Bottom hint */}
      <View style={[s.hintBar, { bottom: insets.bottom + 80 }]}>
        <Text style={s.hintTxt}>
          Pointe la caméra vers le QR du marchand
        </Text>
      </View>

      {/* ── Confirmation modal ── */}
      <Modal visible={screen === S.CONFIRMING} transparent animationType="slide">
        <View style={s.backdrop}>
          <View style={[s.sheet, { paddingBottom: insets.bottom + 24 }]}>
            <View style={s.sheetHandle} />

            <View style={s.sheetIconRow}>
              <View style={s.sheetIcon}>
                <CheckCircle2 size={20} color={COLORS.success} strokeWidth={2.2} />
              </View>
              <View>
                <Text style={s.sheetOverline}>QR VÉRIFIÉ</Text>
                <Text style={s.sheetTitle}>Confirmer la réception</Text>
              </View>
            </View>

            <LinearGradient
              colors={['#D69E4E', '#B5822D']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.sheetAmtCard}
            >
              <Text style={s.sheetMerchant}>{payload?.mname || payload?.mid}</Text>
              <View style={s.sheetAmtRow}>
                <Text style={s.sheetAmt}>{payload?.amt?.toLocaleString('fr-FR')}</Text>
                <Text style={s.sheetAmtCur}>{payload?.cur ?? 'CFA'}</Text>
              </View>
            </LinearGradient>

            <View style={s.sheetSyncNote}>
              <RefreshCw size={11} color={COLORS.grey} strokeWidth={2.2} />
              <Text style={s.sheetSyncTxt}>Enregistré localement, synchronisation dès qu'Internet</Text>
            </View>

            <View style={s.sheetActions}>
              <TouchableOpacity style={s.cancelBtn} onPress={reset} activeOpacity={0.85}>
                <Text style={s.cancelBtnTxt}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.confirmBtn} onPress={handleConfirm} activeOpacity={0.88}>
                <Text style={s.confirmBtnTxt}>Recevoir</Text>
                <ArrowRight size={16} color="#FFF" strokeWidth={2.2} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Processing modal ── */}
      <Modal visible={screen === S.PROCESSING} transparent animationType="fade">
        <View style={s.backdrop}>
          <View style={s.processingCard}>
            <ActivityIndicator size="large" color={COLORS.gold} />
            <Text style={s.processingTxt}>Enregistrement…</Text>
          </View>
        </View>
      </Modal>

      {/* ── Error modal ── */}
      <Modal visible={screen === S.ERROR} transparent animationType="slide">
        <View style={s.backdrop}>
          <View style={[s.sheet, { paddingBottom: insets.bottom + 24 }]}>
            <View style={s.sheetHandle} />
            <View style={s.errorIconRow}>
              <View style={s.errorIcon}>
                <XCircle size={20} color={COLORS.error} strokeWidth={2.2} />
              </View>
              <Text style={s.errorTitle}>Échec de la lecture</Text>
            </View>
            <View style={s.errorBody}>
              <AlertCircle size={14} color={COLORS.error} strokeWidth={2.2} />
              <Text style={s.errorTxt}>{errorMsg}</Text>
            </View>
            <TouchableOpacity style={s.retryBtn} onPress={reset} activeOpacity={0.88}>
              <RefreshCw size={16} color="#FFF" strokeWidth={2.2} />
              <Text style={s.retryBtnTxt}>Réessayer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── Corner marker ───────────────────────────────────────────────────────────
function Corner({ pos }) {
  const isTop  = pos.startsWith('t');
  const isLeft = pos.endsWith('l');
  return (
    <View style={[
      s.corner,
      isTop  ? s.cornerTop  : s.cornerBottom,
      isLeft ? s.cornerLeft : s.cornerRight,
    ]} />
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const RADIUS = 20;
const SHADOW = Platform.select({
  ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 12 },
  default: { elevation: 3 },
});

const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.bg },

  // ── Camera overlay ──
  overlay:       { ...StyleSheet.absoluteFillObject },
  overlayTop:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)' },
  overlayMiddle: { flexDirection: 'row', height: WIN },
  overlaySide:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)' },
  overlayBottom: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)' },
  scanWindow:    { width: WIN, height: WIN },

  topBar:  { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  topPill: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20,
  },
  topTxt: { fontFamily: FONT, fontSize: 13, fontWeight: '700', color: '#FFF', letterSpacing: 0.3 },

  hintBar: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  hintTxt: { fontFamily: FONT, fontSize: 13, color: 'rgba(255,255,255,0.85)', textAlign: 'center', paddingHorizontal: 40 },

  // Corner marks
  corner:       { position: 'absolute', width: 26, height: 26, borderColor: COLORS.gold, borderWidth: 0 },
  cornerTop:    { top: 0,    borderTopWidth: 4 },
  cornerBottom: { bottom: 0, borderBottomWidth: 4 },
  cornerLeft:   { left: 0,   borderLeftWidth: 4 },
  cornerRight:  { right: 0,  borderRightWidth: 4 },

  // ── Permission screen ──
  permRoot: { flex: 1, backgroundColor: COLORS.bg, justifyContent: 'center', paddingHorizontal: SPACE.lg },
  permCard: { backgroundColor: '#FFF', borderRadius: RADIUS, padding: 32, alignItems: 'center', ...SHADOW },
  permIcon: {
    width: 72, height: 72, borderRadius: 24, backgroundColor: COLORS.goldSoft,
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  permTitle: { fontFamily: FONT, fontSize: 20, fontWeight: '800', color: COLORS.black, marginBottom: 8, textAlign: 'center' },
  permBody:  { fontFamily: FONT, fontSize: 13, color: COLORS.grey, textAlign: 'center', lineHeight: 20, marginBottom: 28 },
  permBtn:   { backgroundColor: COLORS.gold, paddingVertical: 14, paddingHorizontal: 32, borderRadius: 14, ...SHADOW },
  permBtnTxt:{ fontFamily: FONT, fontSize: 14, fontWeight: '700', color: '#FFF', letterSpacing: 0.3 },

  // ── Modal shared ──
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: COLORS.bg,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingTop: 12, paddingHorizontal: SPACE.lg,
  },
  sheetHandle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: '#E0E0E0', marginBottom: 20 },

  sheetIconRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  sheetIcon:    { width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.successSoft, alignItems: 'center', justifyContent: 'center' },
  sheetOverline:{ fontFamily: FONT, fontSize: 9, fontWeight: '700', letterSpacing: 2, color: COLORS.success, marginBottom: 2 },
  sheetTitle:   { fontFamily: FONT, fontSize: 18, fontWeight: '800', color: COLORS.black, letterSpacing: -0.5 },

  sheetAmtCard: { borderRadius: RADIUS, padding: 20, marginBottom: 16, ...SHADOW },
  sheetMerchant:{ fontFamily: FONT, fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.85)', marginBottom: 6, letterSpacing: 0.5 },
  sheetAmtRow:  { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  sheetAmt:     { fontFamily: FONT, fontSize: 36, fontWeight: '800', color: '#FFF', letterSpacing: -1.5 },
  sheetAmtCur:  { fontFamily: FONT, fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.8)' },

  sheetSyncNote:{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20 },
  sheetSyncTxt: { flex: 1, fontFamily: FONT, fontSize: 11, color: COLORS.grey, fontStyle: 'italic' },

  sheetActions: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  cancelBtn:    {
    flex: 1, backgroundColor: '#FFF', borderRadius: 14, paddingVertical: 14,
    alignItems: 'center', justifyContent: 'center', ...SHADOW,
  },
  cancelBtnTxt: { fontFamily: FONT, fontSize: 14, fontWeight: '700', color: COLORS.black },
  confirmBtn:   {
    flex: 2, flexDirection: 'row', backgroundColor: COLORS.black, borderRadius: 14,
    paddingVertical: 14, alignItems: 'center', justifyContent: 'center', gap: 6, ...SHADOW,
  },
  confirmBtnTxt:{ fontFamily: FONT, fontSize: 14, fontWeight: '700', color: '#FFF', letterSpacing: 0.3 },

  // ── Processing ──
  processingCard: {
    backgroundColor: '#FFF', borderRadius: RADIUS,
    margin: 60, padding: 32, alignItems: 'center', gap: 16, ...SHADOW,
  },
  processingTxt: { fontFamily: FONT, fontSize: 14, color: COLORS.grey, fontWeight: '500' },

  // ── Error modal ──
  errorIconRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  errorIcon:    { width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.errorSoft, alignItems: 'center', justifyContent: 'center' },
  errorTitle:   { fontFamily: FONT, fontSize: 18, fontWeight: '800', color: COLORS.error },
  errorBody:    {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: COLORS.errorSoft, borderRadius: 12, padding: 14, marginBottom: 20,
  },
  errorTxt:     { flex: 1, fontFamily: FONT, fontSize: 13, color: COLORS.error, lineHeight: 18 },
  retryBtn:     {
    flexDirection: 'row', backgroundColor: COLORS.black, borderRadius: 14, paddingVertical: 14,
    alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8, ...SHADOW,
  },
  retryBtnTxt:  { fontFamily: FONT, fontSize: 14, fontWeight: '700', color: '#FFF' },

  // ── Success ──
  successRoot:  { flex: 1, backgroundColor: COLORS.bg, paddingHorizontal: SPACE.lg, justifyContent: 'space-between' },
  successInner: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  successMark:  {
    width: 96, height: 96, borderRadius: 48,
    alignItems: 'center', justifyContent: 'center', marginBottom: 24, ...SHADOW,
  },
  successTitle: { fontFamily: FONT, fontSize: 24, fontWeight: '800', color: COLORS.black, letterSpacing: -0.5, marginBottom: 24 },

  successAmtCard: {
    width: '100%', backgroundColor: '#FFF', borderRadius: RADIUS,
    padding: 24, marginBottom: 16, ...SHADOW,
  },
  successAmtOver:  { fontFamily: FONT, fontSize: 10, fontWeight: '700', letterSpacing: 2, color: COLORS.grey, marginBottom: 8 },
  successAmtRow:   { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 16 },
  successAmt:      { fontFamily: FONT, fontSize: 40, fontWeight: '800', color: COLORS.success, letterSpacing: -1.5 },
  successAmtCur:   { fontFamily: FONT, fontSize: 14, fontWeight: '600', color: COLORS.grey },
  successDivider:  { height: 1, backgroundColor: '#F0F0F0', marginBottom: 16 },
  successBalRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  successBalLabel: { fontFamily: FONT, fontSize: 12, color: COLORS.grey, fontWeight: '500' },
  successBalValue: { fontFamily: FONT, fontSize: 15, fontWeight: '800', color: COLORS.black },

  syncBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.goldSoft, borderRadius: 14,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  syncBadgeTxt: { fontFamily: FONT, fontSize: 11, fontWeight: '700', color: COLORS.gold, letterSpacing: 0.3 },

  doneBtn: {
    flexDirection: 'row', backgroundColor: COLORS.black, borderRadius: 16,
    paddingVertical: 16, alignItems: 'center', justifyContent: 'center', gap: 8, ...SHADOW,
  },
  doneBtnTxt: { fontFamily: FONT, fontSize: 15, fontWeight: '700', color: '#FFF', letterSpacing: 0.3 },
});
