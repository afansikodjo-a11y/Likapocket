import { useEffect } from 'react';
import { AppState, Platform, View, StyleSheet, useWindowDimensions } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { startNetworkListener } from './src/services/syncService';
import useAppStore from './src/store/useAppStore';
import { COLORS } from './src/theme';

const IS_WEB = Platform.OS === 'web';
// En dessous de cette largeur, la fenêtre EST déjà un téléphone : pas besoin
// du gabarit décoratif, qui gaspillerait de l'espace écran (barres noires).
const FRAME_BREAKPOINT = 500;

export default function App() {
  const { width } = useWindowDimensions();
  const showFrame = IS_WEB && width >= FRAME_BREAKPOINT;

  useEffect(() => {
    const stopSync = startNetworkListener((result) => {
      useAppStore.getState().setLastSyncResult(result);
      useAppStore.getState().refreshWallet();
    });
    return stopSync;
  }, []);

  // Re-verrouille l'app dès qu'elle passe en arrière-plan → le PIN sera
  // redemandé au retour au premier plan (si un PIN est configuré).
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background' || state === 'inactive') {
        useAppStore.getState().setLocked(true);
      }
    });
    return () => sub.remove();
  }, []);

  // Sur web depuis un grand écran (desktop), on encadre l'app dans un gabarit
  // de type téléphone, centré et de hauteur plafonnée, pour éviter qu'elle ne
  // s'étire sur toute la fenêtre. Sur un vrai téléphone (mobile natif ou
  // navigateur mobile), on rend l'app plein écran sans cadre.
  if (showFrame) {
    return (
      <SafeAreaProvider>
        <View style={styles.webPage}>
          <View style={styles.webFrame}>
            <AppNavigator />
          </View>
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <AppNavigator />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  webPage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111111',
    padding: 16,
  },
  webFrame: {
    width: '100%',
    maxWidth: 420,
    height: '100%',
    maxHeight: 880,
    backgroundColor: COLORS.bg,
    borderRadius: 28,
    overflow: 'hidden',
    ...Platform.select({
      web: { boxShadow: '0 20px 60px rgba(0,0,0,0.45)' },
    }),
  },
});
