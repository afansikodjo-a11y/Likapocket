import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, StatusBar, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Wallet, PhoneCall, Signal, FileText, LayoutGrid,
  Smartphone, AlertTriangle,
} from 'lucide-react-native';
import { CATEGORIES } from '../data/servicesTG';
import { detectOperator } from '../services/operatorDetection';
import { COLORS, FONT, SPACE } from '../theme';

const ICONS = {
  wallet:     Wallet,
  'phone-call': PhoneCall,
  signal:     Signal,
  'file-text': FileText,
};

// ── Card de catégorie ─────────────────────────────────────────────────────

function CategoryCard({ category, onPress }) {
  const Icon = ICONS[category.icon] ?? Wallet;
  return (
    <TouchableOpacity
      style={s.card}
      onPress={() => onPress(category)}
      activeOpacity={0.8}
    >
      <View style={[s.cardIcon, { backgroundColor: category.bg }]}>
        <Icon size={26} color={category.color} strokeWidth={2} />
      </View>
      <Text style={s.cardLabel}>{category.label}</Text>
      <Text style={s.cardSub} numberOfLines={2}>{category.description}</Text>
    </TouchableOpacity>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────

export default function ServicesScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [operator, setOperator] = useState(null);
  const isWeb = Platform.OS === 'web';

  useEffect(() => {
    let mounted = true;
    detectOperator().then((op) => mounted && setOperator(op));
    return () => { mounted = false; };
  }, []);

  const handleCategory = (cat) => {
    navigation.navigate('ServiceCategory', { categoryId: cat.id });
  };

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />

      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.headerOver}>SERVICES SIM</Text>
          <Text style={s.headerTitle}>
            <Text style={s.titleGold}>Quick</Text>
            <Text style={s.titleBlack}>Access</Text>
          </Text>
        </View>
        <View style={s.headerIcon}>
          <LayoutGrid size={18} color={COLORS.gold} strokeWidth={2} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <LinearGradient
          colors={['#D69E4E', '#B5822D']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.hero}
        >
          <View style={s.heroIcon}>
            <Smartphone size={22} color="#FFF" strokeWidth={2.2} />
          </View>
          <Text style={s.heroOver}>RACCOURCIS USSD</Text>
          <Text style={s.heroTitle}>
            Toute la SIM, en quelques taps
          </Text>
          <Text style={s.heroSub}>
            Mobile Money, crédit téléphone, forfaits Internet, factures — directement depuis ton opérateur, sans Internet.
          </Text>

          {/* Liste des SIM détectées — un badge par SIM (limité à 1 via expo-cellular) */}
          <View style={s.simRow}>
            {operator && operator.id !== 'unknown' ? (
              <View style={s.simBadge}>
                <View style={[s.simDot, { backgroundColor: '#22C55E' }]} />
                <Text style={s.simTxt}>{operator.label}</Text>
              </View>
            ) : operator && (
              <View style={[s.simBadge, s.simBadgeEmpty]}>
                <View style={[s.simDot, { backgroundColor: COLORS.error }]} />
                <Text style={s.simTxt}>Aucune carte SIM détectée</Text>
              </View>
            )}
          </View>
        </LinearGradient>

        {/* Bannière web */}
        {isWeb && (
          <View style={s.webNotice}>
            <AlertTriangle size={16} color={COLORS.warning} strokeWidth={2.2} />
            <Text style={s.webNoticeTxt}>
              Les services USSD fonctionnent uniquement sur mobile (Android/iOS), pas sur web.
            </Text>
          </View>
        )}

        {/* Grille des catégories — 2 colonnes */}
        <View style={s.grid}>
          {CATEGORIES.map((cat) => (
            <CategoryCard
              key={cat.id}
              category={cat}
              onPress={handleCategory}
            />
          ))}
        </View>

        {/* Footnote */}
        <Text style={s.footnote}>
          LikaPocket ne traite aucune transaction — l'app ouvre seulement le dialer de ton téléphone avec le bon code USSD. C'est ta SIM qui communique avec l'opérateur, en toute sécurité.
        </Text>
      </ScrollView>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const SHADOW = Platform.select({
  ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 12 },
  default: { elevation: 3 },
});

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACE.lg, paddingVertical: 14,
  },
  headerOver: { fontFamily: FONT, fontSize: 10, color: COLORS.grey, fontWeight: '700', letterSpacing: 1.5 },
  headerTitle:{ fontFamily: FONT, fontSize: 20, fontWeight: '800', letterSpacing: -0.5, marginTop: 2 },
  titleGold:  { color: COLORS.gold },
  titleBlack: { color: COLORS.black },
  headerIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.goldSoft,
    alignItems: 'center', justifyContent: 'center',
  },

  // Hero
  hero: {
    marginHorizontal: SPACE.lg, marginTop: 8, marginBottom: 16,
    borderRadius: 20, padding: 20, ...SHADOW,
  },
  heroIcon: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  heroOver:  { fontFamily: FONT, fontSize: 10, fontWeight: '700', letterSpacing: 1.5, color: 'rgba(255,255,255,0.85)', marginBottom: 4 },
  heroTitle: { fontFamily: FONT, fontSize: 22, fontWeight: '800', color: '#FFF', letterSpacing: -0.5, marginBottom: 8 },
  heroSub:   { fontFamily: FONT, fontSize: 12, color: 'rgba(255,255,255,0.85)', lineHeight: 18 },

  simRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 14,
  },
  simBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 999,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  simBadgeEmpty: { backgroundColor: 'rgba(0,0,0,0.18)' },
  simDot: { width: 8, height: 8, borderRadius: 4 },
  simTxt: { fontFamily: FONT, fontSize: 11, color: '#FFF', fontWeight: '700', letterSpacing: 0.3 },

  // Web notice
  webNotice: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: COLORS.warningSoft, borderRadius: 14,
    marginHorizontal: SPACE.lg, marginBottom: 14,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  webNoticeTxt: { flex: 1, fontFamily: FONT, fontSize: 12, color: COLORS.warning, fontWeight: '600', lineHeight: 17 },

  // Grid 2 colonnes
  grid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: SPACE.lg, gap: 12,
  },
  card: {
    width: '47%',
    backgroundColor: '#FFF', borderRadius: 20,
    padding: 16, ...SHADOW,
  },
  cardIcon: {
    width: 50, height: 50, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
  },
  cardLabel: { fontFamily: FONT, fontSize: 14, fontWeight: '800', color: COLORS.black, marginBottom: 4, letterSpacing: -0.2 },
  cardSub:   { fontFamily: FONT, fontSize: 11, color: COLORS.grey, lineHeight: 15 },

  // Footnote
  footnote: {
    paddingHorizontal: SPACE.lg, marginTop: 20,
    fontFamily: FONT, fontSize: 11, color: COLORS.grey, lineHeight: 16, textAlign: 'center',
  },
});
