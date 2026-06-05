import { useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, useWindowDimensions, Platform, StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Coins, WifiOff, Smartphone, ArrowRight, Check,
} from 'lucide-react-native';
import { saveSecureValue } from '../database';
import { COLORS, FONT, SPACE } from '../theme';

// ── Slides content ─────────────────────────────────────────────────────────

const SLIDES = [
  {
    key:      'reliquat',
    icon:     Coins,
    iconBg:   ['#D69E4E', '#B5822D'],
    title:    'Ne perdez plus\nvos pièces',
    subtitle: 'Chaque reliquat compte. LikaPocket convertit la monnaie de tes achats en solde numérique, sécurisé sur ton téléphone.',
    accent:   COLORS.gold,
  },
  {
    key:      'offline',
    icon:     WifiOff,
    iconBg:   ['#1A7F4B', '#22A55B'],
    title:    'Payez sans\nInternet',
    subtitle: 'Génère ou scanne un QR code pour échanger instantanément, même hors connexion. La sync se fait toute seule dès le retour du réseau.',
    accent:   COLORS.success,
  },
  {
    key:      'momo',
    icon:     Smartphone,
    iconBg:   ['#7C3AED', '#A78BFA'],
    title:    'Reliez à votre\nMobile Money',
    subtitle: 'Convertis ton solde LikaPocket en Orange Money, Wave ou Moov en un clic. Recharge aussi facilement.',
    accent:   '#7C3AED',
  },
];

// ── Dots ───────────────────────────────────────────────────────────────────

function Dots({ index }) {
  return (
    <View style={s.dotsRow}>
      {SLIDES.map((_, i) => (
        <View key={i} style={[s.dot, i === index && s.dotActive]} />
      ))}
    </View>
  );
}

// ── Slide ──────────────────────────────────────────────────────────────────

function Slide({ slide, width }) {
  const Icon = slide.icon;
  return (
    <View style={[s.slide, { width }]}>
      <LinearGradient
        colors={slide.iconBg}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.iconWrap}
      >
        <Icon size={56} color="#FFFFFF" strokeWidth={1.8} />
      </LinearGradient>

      <Text style={s.title}>{slide.title}</Text>
      <Text style={s.subtitle}>{slide.subtitle}</Text>
    </View>
  );
}

// ── Component ──────────────────────────────────────────────────────────────

export default function OnboardingScreen({ onComplete }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scrollRef = useRef(null);
  const [index,   setIndex]   = useState(0);
  const [busy,    setBusy]    = useState(false);

  const isLast = index === SLIDES.length - 1;

  const handleNext = () => {
    if (isLast) return handleFinish();
    const next = index + 1;
    scrollRef.current?.scrollTo({ x: next * width, animated: true });
    setIndex(next);
  };

  const handleFinish = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await saveSecureValue('onboarding_done', '1');
      // Web fallback (saveSecureValue is no-op on web)
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('onboarding_done', '1');
      }
    } catch {}
    onComplete?.();
  };

  const handleSkip = () => handleFinish();

  const handleScroll = (e) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    if (i !== index) setIndex(i);
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />

      {/* ── Top bar: brand + skip ── */}
      <View style={[s.topBar, { paddingTop: insets.top + 12 }]}>
        <Text style={s.brand}>
          <Text style={s.brandGold}>Lika</Text>
          <Text style={s.brandBlack}>Pocket</Text>
        </Text>
        {!isLast && (
          <TouchableOpacity onPress={handleSkip} hitSlop={12}>
            <Text style={s.skipTxt}>Passer</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Slides ── */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        style={{ flex: 1 }}
      >
        {SLIDES.map((slide) => <Slide key={slide.key} slide={slide} width={width} />)}
      </ScrollView>

      {/* ── Bottom controls ── */}
      <View style={[s.bottom, { paddingBottom: insets.bottom + 20 }]}>
        <Dots index={index} />

        <TouchableOpacity
          style={[s.cta, isLast && s.ctaFinal]}
          onPress={handleNext}
          disabled={busy}
          activeOpacity={0.88}
        >
          <Text style={s.ctaTxt}>
            {isLast ? 'Commencer' : 'Suivant'}
          </Text>
          {isLast
            ? <Check     size={18} color="#FFF" strokeWidth={2.4} />
            : <ArrowRight size={18} color="#FFF" strokeWidth={2.4} />}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const SHADOW = Platform.select({
  ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.12, shadowRadius: 18 },
  default: { elevation: 6 },
});

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },

  // Top bar
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACE.lg, paddingBottom: 12,
  },
  brand:      { fontFamily: FONT, fontSize: 18, fontWeight: '800', letterSpacing: -0.5 },
  brandGold:  { color: COLORS.gold },
  brandBlack: { color: COLORS.black },
  skipTxt:    { fontFamily: FONT, fontSize: 13, fontWeight: '700', color: COLORS.grey, letterSpacing: 0.3 },

  // Slide
  slide: {
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: SPACE.xl, paddingBottom: 40,
  },
  iconWrap: {
    width: 140, height: 140, borderRadius: 36,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 48, ...SHADOW,
  },
  title: {
    fontFamily: FONT, fontSize: 30, fontWeight: '800',
    color: COLORS.black, textAlign: 'center',
    letterSpacing: -1, lineHeight: 36, marginBottom: 16,
  },
  subtitle: {
    fontFamily: FONT, fontSize: 14, color: COLORS.grey,
    textAlign: 'center', lineHeight: 22, paddingHorizontal: 8,
  },

  // Bottom
  bottom: { paddingHorizontal: SPACE.lg, paddingTop: 16 },
  dotsRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 24 },
  dot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#E0E0E0',
  },
  dotActive: { backgroundColor: COLORS.gold, width: 24 },

  cta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.black, borderRadius: 16,
    paddingVertical: 16, gap: 8, ...SHADOW,
  },
  ctaFinal: { backgroundColor: COLORS.gold },
  ctaTxt: { fontFamily: FONT, fontSize: 15, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.3 },
});
