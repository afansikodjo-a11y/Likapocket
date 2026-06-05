import { useEffect, useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, Image, ScrollView,
  StyleSheet, Platform, Linking, Dimensions, Animated, Easing,
} from 'react-native';
import { getActiveAds } from '../services/adsService';
import { COLORS, FONT, SPACE } from '../theme';

const WINDOW_WIDTH = Dimensions.get('window').width;
const BANNER_W = WINDOW_WIDTH - SPACE.lg * 2;
const BANNER_H = Math.round(BANNER_W * 0.52); // ratio ~2:1 pour remplir la zone réservée

/**
 * Bannière publicitaire en bas du Home. Carrousel horizontal si plusieurs ads.
 *
 * - Si la table `ads` est vide ou en erreur → ne rend rien (fallback silencieux)
 * - Tap sur une bannière avec `link_url` → ouvre le lien
 */
export default function AdBanner() {
  const [ads, setAds] = useState([]);
  const [index, setIndex] = useState(0);
  const scrollRef = useRef(null);

  // Animation d'apparition : fade + slide up + scale subtil
  const opacity   = useRef(new Animated.Value(0)).current;
  const translate = useRef(new Animated.Value(24)).current;
  const scale     = useRef(new Animated.Value(0.96)).current;

  useEffect(() => {
    let mounted = true;
    getActiveAds().then((data) => mounted && setAds(data));
    return () => { mounted = false; };
  }, []);

  // Déclenche l'animation dès que les ads sont chargées
  useEffect(() => {
    if (ads.length === 0) return;
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 550,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translate, {
        toValue: 0,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 7,
        tension: 60,
        useNativeDriver: true,
      }),
    ]).start();
  }, [ads.length]);

  // Auto-scroll si plusieurs bannières
  useEffect(() => {
    if (ads.length <= 1) return;
    const interval = setInterval(() => {
      setIndex((i) => {
        const next = (i + 1) % ads.length;
        scrollRef.current?.scrollTo({ x: next * BANNER_W, animated: true });
        return next;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [ads.length]);

  if (ads.length === 0) return null;

  return (
    <Animated.View
      style={[
        s.wrap,
        {
          opacity,
          transform: [{ translateY: translate }, { scale }],
        },
      ]}
    >
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const i = Math.round(e.nativeEvent.contentOffset.x / BANNER_W);
          setIndex(i);
        }}
      >
        {ads.map((ad) => (
          <TouchableOpacity
            key={ad.id}
            style={[s.banner, { width: BANNER_W, height: BANNER_H }]}
            activeOpacity={ad.link_url ? 0.85 : 1}
            onPress={() => ad.link_url && Linking.openURL(ad.link_url).catch(() => {})}
            disabled={!ad.link_url}
          >
            <Image
              source={{ uri: ad.image_url }}
              style={s.image}
              resizeMode="cover"
            />
            {ad.title && (
              <View style={s.titleOverlay}>
                <Text style={s.titleTxt} numberOfLines={1}>{ad.title}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Indicateurs */}
      {ads.length > 1 && (
        <View style={s.dots}>
          {ads.map((_, i) => (
            <View key={i} style={[s.dot, i === index && s.dotActive]} />
          ))}
        </View>
      )}
    </Animated.View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const SHADOW = Platform.select({
  ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12 },
  default: { elevation: 3 },
});

const s = StyleSheet.create({
  wrap: { marginHorizontal: SPACE.lg, marginTop: 16 },

  banner: {
    borderRadius: 16, overflow: 'hidden',
    backgroundColor: '#FFF', ...SHADOW,
  },
  image: { width: '100%', height: '100%' },
  titleOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 14, paddingVertical: 10,
  },
  titleTxt: { fontFamily: FONT, fontSize: 13, fontWeight: '700', color: '#FFF' },

  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 10 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#D0D0D0' },
  dotActive: { backgroundColor: COLORS.gold, width: 18 },
});
