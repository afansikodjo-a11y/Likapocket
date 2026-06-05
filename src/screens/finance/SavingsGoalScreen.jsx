import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, Modal,
  StyleSheet, Platform, KeyboardAvoidingView, ActivityIndicator, Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ChevronLeft, Check, AlertCircle, Lock, Unlock, PiggyBank, AlertTriangle,
} from 'lucide-react-native';
import {
  createSavingsGoal, getSavingsGoal, depositToSavings, withdrawFromSavings,
} from '../../database';
import useAppStore from '../../store/useAppStore';
import SecurityPrompt from '../../components/SecurityPrompt';
import { COLORS, FONT, SPACE } from '../../theme';

const fmt = (n) => (n ?? 0).toLocaleString('fr-FR');

const FREQUENCIES = [
  { key: 'DAILY',   label: 'Chaque jour' },
  { key: 'WEEKLY',  label: 'Chaque semaine' },
  { key: 'MONTHLY', label: 'Chaque mois' },
];
const DURATIONS = [
  { key: 1,  label: '1 mois' },
  { key: 3,  label: '3 mois' },
  { key: 6,  label: '6 mois' },
  { key: 12, label: '1 an' },
];
function computeUnlock(months) {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}
const FREQ_LABEL = { DAILY: 'jour', WEEKLY: 'semaine', MONTHLY: 'mois' };

export default function SavingsGoalScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const goalId = route.params?.goalId ?? null;
  const isCreate = !goalId;

  const balance = useAppStore((s) => s.balance);
  const refreshWallet = useAppStore((s) => s.refreshWallet);

  const [goal, setGoal] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Création
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [contribution, setContribution] = useState('');
  const [frequency, setFrequency] = useState('MONTHLY');
  const [durationMonths, setDurationMonths] = useState(3);

  // Détail / dépôt
  const [depositText, setDepositText] = useState('');
  const [authPending, setAuthPending] = useState(false);
  const [confirmUnlock, setConfirmUnlock] = useState(false);

  const loadGoal = useCallback(async () => {
    if (goalId) setGoal(await getSavingsGoal(goalId));
  }, [goalId]);

  useEffect(() => { loadGoal(); refreshWallet(); }, [loadGoal, refreshWallet]);
  useEffect(() => { if (goal && !depositText) setDepositText(String(goal.contribution_amount)); }, [goal]);

  // ── Création ──────────────────────────────────────────────────────────────
  const handleCreate = async () => {
    Keyboard.dismiss();
    setError('');
    const t = Math.round(parseFloat(target.replace(',', '.')));
    const c = Math.round(parseFloat(contribution.replace(',', '.')));
    if (!name.trim()) { setError('Donnez un nom à votre coffre.'); return; }
    if (!isFinite(t) || t <= 0) { setError('Objectif invalide.'); return; }
    if (!isFinite(c) || c <= 0) { setError('Montant de cotisation invalide.'); return; }
    setBusy(true);
    try {
      await createSavingsGoal({
        name, targetAmount: t, contributionAmount: c, frequency,
        unlockDate: computeUnlock(durationMonths),
      });
      navigation.goBack();
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };

  // ── Dépôt ───────────────────────────────────────────────────────────────
  const handleDepositPress = () => {
    setError('');
    const amount = Math.round(parseFloat(depositText.replace(',', '.')));
    if (!isFinite(amount) || amount <= 0) { setError('Montant de dépôt invalide.'); return; }
    if (balance !== null && balance < amount) { setError(`Solde insuffisant (${fmt(balance)} F).`); return; }
    setAuthPending(true);
  };

  const performDeposit = async () => {
    setAuthPending(false);
    const amount = Math.round(parseFloat(depositText.replace(',', '.')));
    setBusy(true);
    try {
      await depositToSavings(goal.id, amount);
      await refreshWallet();
      await loadGoal();
    } catch (e) {
      setError(e.message);
    } finally { setBusy(false); }
  };

  // ── Déblocage ─────────────────────────────────────────────────────────────
  const matured = goal ? new Date() >= new Date(String(goal.unlock_date).replace(' ', 'T')) : false;

  const performUnlock = async () => {
    setConfirmUnlock(false);
    setBusy(true);
    try {
      await withdrawFromSavings(goal.id, { early: !matured });
      await refreshWallet();
      await loadGoal();
    } catch (e) {
      setError(e.message);
    } finally { setBusy(false); }
  };

  const isClosed = goal && (goal.status === 'UNLOCKED' || goal.status === 'BROKEN');
  const ratio = goal ? Math.min((goal.current_amount ?? 0) / goal.target_amount, 1) : 0;

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10} style={s.backBtn}>
          <ChevronLeft size={22} color={COLORS.black} strokeWidth={2.2} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{isCreate ? 'Nouveau coffre' : 'Mon coffre'}</Text>
        <View style={{ width: 36 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: SPACE.lg, paddingBottom: insets.bottom + 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {isCreate ? (
            <>
              <View style={s.introCard}>
                <PiggyBank size={26} color={COLORS.gold} strokeWidth={2} />
                <Text style={s.introTxt}>
                  Bloque une somme jusqu'à une échéance pour atteindre un objectif. L'argent quitte ton solde
                  et revient au déblocage.
                </Text>
              </View>

              <Text style={s.label}>NOM DU COFFRE</Text>
              <View style={s.inputBox}>
                <TextInput style={s.input} value={name} onChangeText={setName} placeholder="Ex : Rentrée scolaire" placeholderTextColor="#C9C9C9" maxLength={40} />
              </View>

              <Text style={s.label}>OBJECTIF À ATTEINDRE</Text>
              <View style={s.inputBox}>
                <TextInput style={s.input} value={target} onChangeText={setTarget} keyboardType="numeric" placeholder="0" placeholderTextColor="#C9C9C9" maxLength={10} />
                <Text style={s.inputCur}>F CFA</Text>
              </View>

              <Text style={s.label}>MONTANT DE CHAQUE COTISATION</Text>
              <View style={s.inputBox}>
                <TextInput style={s.input} value={contribution} onChangeText={setContribution} keyboardType="numeric" placeholder="0" placeholderTextColor="#C9C9C9" maxLength={10} />
                <Text style={s.inputCur}>F CFA</Text>
              </View>

              <Text style={s.label}>FRÉQUENCE DE DÉPÔT</Text>
              <View style={s.chipRow}>
                {FREQUENCIES.map((f) => {
                  const on = frequency === f.key;
                  return (
                    <TouchableOpacity key={f.key} style={[s.chip, on && s.chipOn]} onPress={() => setFrequency(f.key)} activeOpacity={0.8}>
                      <Text style={[s.chipTxt, on && s.chipTxtOn]}>{f.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={s.label}>DURÉE DE BLOCAGE</Text>
              <View style={s.chipRow}>
                {DURATIONS.map((d) => {
                  const on = durationMonths === d.key;
                  return (
                    <TouchableOpacity key={d.key} style={[s.chip, on && s.chipOn]} onPress={() => setDurationMonths(d.key)} activeOpacity={0.8}>
                      <Text style={[s.chipTxt, on && s.chipTxtOn]}>{d.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text style={s.hint}>Déblocage prévu le {computeUnlock(durationMonths)}.</Text>

              {error ? <View style={s.errorBox}><AlertCircle size={14} color={COLORS.error} strokeWidth={2.2} /><Text style={s.errorTxt}>{error}</Text></View> : null}

              <TouchableOpacity style={[s.cta, busy && s.ctaDisabled]} onPress={handleCreate} disabled={busy} activeOpacity={0.88}>
                {busy ? <ActivityIndicator color="#FFF" /> : <><Lock size={17} color="#FFF" strokeWidth={2.4} /><Text style={s.ctaTxt}>Créer le coffre</Text></>}
              </TouchableOpacity>
            </>
          ) : !goal ? (
            <ActivityIndicator color={COLORS.gold} style={{ marginTop: 40 }} />
          ) : (
            <>
              {/* Carte coffre */}
              <LinearGradient colors={['#0F766E', '#0D9488']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.potCard}>
                <View style={s.potHead}>
                  <Lock size={14} color="rgba(255,255,255,0.9)" strokeWidth={2.2} />
                  <Text style={s.potName} numberOfLines={1}>{goal.name}</Text>
                </View>
                <Text style={s.potCurrent}>{fmt(goal.current_amount)} F</Text>
                <Text style={s.potTarget}>Objectif : {fmt(goal.target_amount)} F</Text>
                <View style={s.potBarTrack}>
                  <View style={[s.potBarFill, { width: `${ratio * 100}%` }]} />
                </View>
                <Text style={s.potFoot}>
                  {goal.contribution_amount ? `${fmt(goal.contribution_amount)} F / ${FREQ_LABEL[goal.frequency]}` : ''}
                  {'  ·  '}Déblocage le {String(goal.unlock_date).slice(0, 10)}
                </Text>
              </LinearGradient>

              {isClosed ? (
                <View style={s.closedBox}>
                  <Text style={s.closedTxt}>
                    {goal.status === 'BROKEN' ? 'Ce coffre a été débloqué par anticipation.' : 'Ce coffre a été débloqué.'}
                  </Text>
                </View>
              ) : (
                <>
                  {/* Dépôt */}
                  <Text style={s.label}>DÉPOSER DANS LE COFFRE</Text>
                  <View style={s.inputBox}>
                    <TextInput style={s.input} value={depositText} onChangeText={setDepositText} keyboardType="numeric" placeholder="0" placeholderTextColor="#C9C9C9" maxLength={10} />
                    <Text style={s.inputCur}>F CFA</Text>
                  </View>
                  <Text style={s.hint}>Solde disponible : {fmt(balance)} F</Text>

                  {error ? <View style={s.errorBox}><AlertCircle size={14} color={COLORS.error} strokeWidth={2.2} /><Text style={s.errorTxt}>{error}</Text></View> : null}

                  <TouchableOpacity style={[s.cta, busy && s.ctaDisabled]} onPress={handleDepositPress} disabled={busy} activeOpacity={0.88}>
                    {busy ? <ActivityIndicator color="#FFF" /> : <><Check size={17} color="#FFF" strokeWidth={2.4} /><Text style={s.ctaTxt}>Déposer</Text></>}
                  </TouchableOpacity>

                  {/* Déblocage */}
                  <TouchableOpacity style={[s.unlockBtn, matured && s.unlockBtnReady]} onPress={() => setConfirmUnlock(true)} disabled={busy} activeOpacity={0.85}>
                    <Unlock size={16} color={matured ? COLORS.success : COLORS.warning} strokeWidth={2.2} />
                    <Text style={[s.unlockTxt, { color: matured ? COLORS.success : COLORS.warning }]}>
                      {matured ? 'Débloquer mon épargne' : 'Débloquer par anticipation'}
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Auth pour dépôt */}
      <SecurityPrompt
        visible={authPending}
        reason={`Déposer ${fmt(Math.round(parseFloat(depositText.replace(',', '.')) || 0))} F dans « ${goal?.name ?? ''} »`}
        onSuccess={performDeposit}
        onCancel={() => setAuthPending(false)}
      />

      {/* Confirmation déblocage */}
      <Modal visible={confirmUnlock} transparent animationType="fade" onRequestClose={() => setConfirmUnlock(false)}>
        <View style={s.backdrop}>
          <View style={s.confirmCard}>
            <View style={[s.confirmIcon, { backgroundColor: matured ? COLORS.successSoft : COLORS.warningSoft }]}>
              {matured
                ? <Unlock size={26} color={COLORS.success} strokeWidth={2} />
                : <AlertTriangle size={26} color={COLORS.warning} strokeWidth={2} />}
            </View>
            <Text style={s.confirmTitle}>{matured ? 'Débloquer l\'épargne ?' : 'Déblocage anticipé ?'}</Text>
            <Text style={s.confirmTxt}>
              {matured
                ? `${fmt(goal?.current_amount)} F vont revenir sur ton solde Lika.`
                : `L'échéance n'est pas atteinte. ${fmt(goal?.current_amount)} F reviendront sur ton solde, mais le coffre sera marqué « rompu ».`}
            </Text>
            <TouchableOpacity style={[s.cta, !matured && { backgroundColor: COLORS.warning }]} onPress={performUnlock} activeOpacity={0.88}>
              <Text style={s.ctaTxt}>{matured ? 'Confirmer' : 'Débloquer quand même'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.cancelBtn} onPress={() => setConfirmUnlock(false)} activeOpacity={0.7}>
              <Text style={s.cancelTxt}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const RADIUS = 20;
const SHADOW = Platform.select({
  ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 12 },
  default: { elevation: 3 },
});

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACE.lg, paddingVertical: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', ...SHADOW },
  headerTitle: { fontFamily: FONT, fontSize: 17, fontWeight: '800', color: COLORS.black, letterSpacing: -0.3 },

  introCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.goldSoft, borderRadius: 16, padding: 16, marginTop: 8, marginBottom: 18 },
  introTxt: { flex: 1, fontFamily: FONT, fontSize: 12, color: COLORS.goldDark, lineHeight: 17, fontWeight: '500' },

  label: { fontFamily: FONT, fontSize: 10, fontWeight: '700', letterSpacing: 1.5, color: COLORS.grey, marginBottom: 8, marginTop: 6 },
  inputBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFF', borderRadius: 12, paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 14 : 10, borderWidth: 1, borderColor: '#EEEEEE', marginBottom: 14 },
  input: { flex: 1, fontFamily: FONT, fontSize: 16, color: COLORS.black, padding: 0 },
  inputCur: { fontFamily: FONT, fontSize: 14, fontWeight: '600', color: COLORS.grey },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: { backgroundColor: '#FFF', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1.5, borderColor: '#EEEEEE' },
  chipOn: { borderColor: COLORS.gold, backgroundColor: COLORS.goldSoft },
  chipTxt: { fontFamily: FONT, fontSize: 12, fontWeight: '700', color: COLORS.grey },
  chipTxtOn: { color: COLORS.gold },

  hint: { fontFamily: FONT, fontSize: 11, color: COLORS.grey, marginBottom: 14 },

  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.errorSoft, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 14 },
  errorTxt: { flex: 1, fontFamily: FONT, fontSize: 12, color: COLORS.error, fontWeight: '500' },

  cta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.black, borderRadius: 16, paddingVertical: 16, ...SHADOW },
  ctaDisabled: { backgroundColor: '#BBBBBB' },
  ctaTxt: { fontFamily: FONT, fontSize: 15, fontWeight: '700', color: '#FFF', letterSpacing: 0.3 },

  // Pot card
  potCard: { borderRadius: RADIUS, padding: 22, marginTop: 8, marginBottom: 20, ...SHADOW },
  potHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  potName: { fontFamily: FONT, fontSize: 14, fontWeight: '700', color: 'rgba(255,255,255,0.95)', flex: 1 },
  potCurrent: { fontFamily: FONT, fontSize: 34, fontWeight: '800', color: '#FFF', letterSpacing: -1.5 },
  potTarget: { fontFamily: FONT, fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: '600', marginTop: 4, marginBottom: 14 },
  potBarTrack: { height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.25)', overflow: 'hidden' },
  potBarFill: { height: 8, borderRadius: 4, backgroundColor: '#FFF' },
  potFoot: { fontFamily: FONT, fontSize: 11, color: 'rgba(255,255,255,0.9)', fontWeight: '600', marginTop: 12 },

  closedBox: { backgroundColor: '#FFF', borderRadius: 16, padding: 18, ...SHADOW },
  closedTxt: { fontFamily: FONT, fontSize: 13, color: COLORS.grey, fontWeight: '600', textAlign: 'center', lineHeight: 19 },

  unlockBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#FFF', borderRadius: 16, paddingVertical: 15, marginTop: 12, borderWidth: 1.5, borderColor: COLORS.warningSoft },
  unlockBtnReady: { borderColor: COLORS.successSoft },
  unlockTxt: { fontFamily: FONT, fontSize: 14, fontWeight: '700' },

  // Confirm modal
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: SPACE.lg },
  confirmCard: { width: '100%', maxWidth: 360, backgroundColor: COLORS.bg, borderRadius: 24, padding: 24, alignItems: 'center', ...SHADOW },
  confirmIcon: { width: 60, height: 60, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  confirmTitle: { fontFamily: FONT, fontSize: 17, fontWeight: '800', color: COLORS.black, marginBottom: 8, textAlign: 'center' },
  confirmTxt: { fontFamily: FONT, fontSize: 13, color: COLORS.grey, textAlign: 'center', lineHeight: 19, marginBottom: 20 },
  cancelBtn: { paddingVertical: 14, marginTop: 4 },
  cancelTxt: { fontFamily: FONT, fontSize: 14, fontWeight: '700', color: COLORS.grey },
});
