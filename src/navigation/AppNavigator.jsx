import { useEffect, useState } from 'react';
import { View, ActivityIndicator, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, ArrowDownLeft, ArrowUpRight, Clock, PiggyBank } from 'lucide-react-native';
import { supabase, bootstrapOAuthFromUrl } from '../services/supabase';
import { getSecureValue } from '../database';
import useAppStore from '../store/useAppStore';
import { COLORS, FONT } from '../theme';

import AuthScreen       from '../screens/AuthScreen';
import HomeScreen       from '../screens/HomeScreen';
import MerchantScreen   from '../screens/MerchantScreen';
import ScanScreen       from '../screens/ScanScreen';
import HistoryScreen    from '../screens/HistoryScreen';
import ProfileScreen    from '../screens/ProfileScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import TransferScreen    from '../screens/TransferScreen';
import PinScreen           from '../screens/PinScreen';
import AdminScreen         from '../screens/AdminScreen';
import ResetPasswordScreen from '../screens/ResetPasswordScreen';
import HelpScreen          from '../screens/HelpScreen';
import TermsScreen         from '../screens/TermsScreen';
// ── Module Finances perso (remplace l'ancien onglet Services USSD) ──────────
// Les écrans USSD (ServicesScreen, services/*) sont conservés dans le repo mais
// déréférencés de la navigation (réintégration future via Moneroo, sans USSD).
import FinanceScreen     from '../screens/finance/FinanceScreen';
import ManualEntryScreen from '../screens/finance/ManualEntryScreen';
import BudgetsScreen     from '../screens/finance/BudgetsScreen';
import SavingsGoalScreen from '../screens/finance/SavingsGoalScreen';
import AdminAdsScreen          from '../screens/AdminAdsScreen';
import { isPinSet } from '../services/pinService';

const RootStack = createNativeStackNavigator();
const AuthN     = createNativeStackNavigator();
const Tab       = createBottomTabNavigator();

// ── App tabs ───────────────────────────────────────────────────────────────

function AppTabs() {
  const insets = useSafeAreaInsets();

  // Tab bar dynamique : on ajoute l'inset bottom (navigation gestuelle Android,
  // home indicator iPhone) à la hauteur et au padding du bas pour que le label
  // ne soit jamais coupé.
  const tabBarStyle = {
    backgroundColor: '#FFFFFF',
    borderTopWidth:  1,
    borderTopColor:  '#F0F0F0',
    height:          60 + insets.bottom,
    paddingBottom:   8 + insets.bottom,
    paddingTop:      8,
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.06, shadowRadius: 12 },
      default: { elevation: 12 },
    }),
  };

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown:  false,
        tabBarStyle:  tabBarStyle,
        tabBarActiveTintColor:   COLORS.gold,
        tabBarInactiveTintColor: '#BBBBBB',
        tabBarLabelStyle: {
          fontFamily: FONT,
          fontSize:   11,
          fontWeight: '600',
          marginTop:  2,
        },
        tabBarIcon: ({ color }) => {
          const props = { size: 22, color, strokeWidth: 2 };
          switch (route.name) {
            case 'Home':     return <Home          {...props} />;
            case 'Scan':     return <ArrowDownLeft {...props} />;
            case 'Merchant': return <ArrowUpRight  {...props} />;
            case 'Finances': return <PiggyBank     {...props} />;
            case 'History':  return <Clock         {...props} />;
          }
        },
      })}
    >
      <Tab.Screen name="Home"     component={HomeScreen}     options={{ title: 'Accueil'    }} />
      <Tab.Screen name="Scan"     component={ScanScreen}     options={{ title: 'Recevoir'   }} />
      <Tab.Screen name="Merchant" component={MerchantScreen} options={{ title: 'Envoyer'    }} />
      <Tab.Screen name="Finances" component={FinanceScreen}  options={{ title: 'Finances'   }} />
      <Tab.Screen name="History"  component={HistoryScreen}  options={{ title: 'Historique' }} />
    </Tab.Navigator>
  );
}

// ── Read first-launch flag ─────────────────────────────────────────────────
async function readOnboardingDone() {
  // Native
  try {
    const v = await getSecureValue('onboarding_done');
    if (v) return true;
  } catch {}
  // Web fallback
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage.getItem('onboarding_done') === '1';
  }
  return false;
}

// ── Root navigator ─────────────────────────────────────────────────────────

export default function AppNavigator() {
  const session    = useAppStore((s) => s.session);
  const setSession = useAppStore((s) => s.setSession);
  const isLocked   = useAppStore((s) => s.isLocked);
  const setLocked  = useAppStore((s) => s.setLocked);
  const [onboardingDone, setOnboardingDone] = useState(undefined); // undefined = loading
  const [pinConfigured,  setPinConfigured]  = useState(undefined); // undefined = loading
  const [isRecovering,   setIsRecovering]   = useState(false);     // PASSWORD_RECOVERY mode

  // ── First-launch detection ─────────────────────────────────────────────
  useEffect(() => {
    readOnboardingDone().then(setOnboardingDone);
    isPinSet().then(setPinConfigured);
  }, []);

  // ── Auth listener ──────────────────────────────────────────────────────
  useEffect(() => {
    const fallback = setTimeout(
      () => useAppStore.setState((st) => st.session === undefined ? { session: null } : {}),
      3000,
    );

    // Capte d'abord un éventuel retour OAuth (web) avant de lire la session.
    bootstrapOAuthFromUrl()
      .catch(() => null)
      .then(() => supabase.auth.getSession())
      .then(({ data: { session: s } }) => { clearTimeout(fallback); setSession(s); })
      .catch(() => { clearTimeout(fallback); setSession(null); });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      // Quand l'utilisateur clique sur le lien "Mot de passe oublié" reçu par mail,
      // Supabase déclenche cet événement → on affiche le ResetPasswordScreen.
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovering(true);
      } else if (event === 'SIGNED_OUT') {
        setIsRecovering(false);
      }
      setSession(s);
    });
    return () => { clearTimeout(fallback); subscription.unsubscribe(); };
  }, []);

  // ── Password recovery flow (l'utilisateur a cliqué sur le lien mail) ──
  if (isRecovering) {
    return <ResetPasswordScreen onDone={() => setIsRecovering(false)} />;
  }

  // ── Splash while loading ───────────────────────────────────────────────
  if (session === undefined || onboardingDone === undefined || pinConfigured === undefined) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F9F9F9' }}>
        <ActivityIndicator size="large" color={COLORS.gold} />
      </View>
    );
  }

  // ── Force PIN setup after first sign-in / sign-up ─────────────────────
  if (session && !pinConfigured) {
    return (
      <PinScreen
        mode="setup"
        canCancel={false}
        onUnlock={() => { setPinConfigured(true); setLocked(false); }}
        navigation={{ goBack: () => {} }}
        route={{ params: {} }}
      />
    );
  }

  // ── Lock screen when PIN is set and app is locked ─────────────────────
  if (session && pinConfigured && isLocked) {
    return (
      <PinScreen
        mode="verify"
        canCancel={false}
        onUnlock={() => setLocked(false)}
        navigation={{ goBack: () => {} }}
        route={{ params: {} }}
      />
    );
  }

  // ── Onboarding first ───────────────────────────────────────────────────
  if (!onboardingDone) {
    return (
      <NavigationContainer>
        <OnboardingScreen onComplete={() => setOnboardingDone(true)} />
      </NavigationContainer>
    );
  }

  // ── Auth or App ─────────────────────────────────────────────────────────
  return (
    <NavigationContainer>
      {session ? (
        <RootStack.Navigator screenOptions={{ headerShown: false }}>
          <RootStack.Screen name="Tabs"     component={AppTabs} />
          <RootStack.Screen name="Profile"  component={ProfileScreen}  options={{ animation: 'slide_from_right' }} />
          <RootStack.Screen name="Transfer" component={TransferScreen} options={{ animation: 'slide_from_right' }} />
          <RootStack.Screen name="Pin"      component={PinScreen}      options={{ animation: 'slide_from_bottom', gestureEnabled: false }} />
          <RootStack.Screen name="Admin"    component={AdminScreen}    options={{ animation: 'slide_from_right' }} />
          <RootStack.Screen name="Help"     component={HelpScreen}     options={{ animation: 'slide_from_right' }} />
          <RootStack.Screen name="Terms"    component={TermsScreen}    options={{ animation: 'slide_from_right' }} />
          <RootStack.Screen name="ManualEntry" component={ManualEntryScreen} options={{ animation: 'slide_from_right' }} />
          <RootStack.Screen name="Budgets"     component={BudgetsScreen}     options={{ animation: 'slide_from_right' }} />
          <RootStack.Screen name="SavingsGoal" component={SavingsGoalScreen} options={{ animation: 'slide_from_right' }} />
          <RootStack.Screen name="AdminAds"           component={AdminAdsScreen}          options={{ animation: 'slide_from_right' }} />
        </RootStack.Navigator>
      ) : (
        <AuthN.Navigator screenOptions={{ headerShown: false }}>
          <AuthN.Screen name="Auth" component={AuthScreen} />
        </AuthN.Navigator>
      )}
    </NavigationContainer>
  );
}
