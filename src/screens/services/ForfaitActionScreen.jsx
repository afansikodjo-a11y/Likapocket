import { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, FlatList,
  StyleSheet, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft, Signal, ChevronRight, AlertCircle,
} from 'lucide-react-native';
import { getService, OPERATORS } from '../../data/servicesTG';
import { FORFAIT_TABS, getYasForfaitsByTab } from '../../data/forfaitsYas';
import { getMoovForfaitsByTab } from '../../data/forfaitsMoov';
import { dialUSSD, resolveUSSD } from '../../services/ussdHelper';
import PinPromptDialog from '../../components/PinPromptDialog';
import { COLORS, FONT, SPACE } from '../../theme';

export default function ForfaitActionScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { serviceId } = route.params;
  const service = getService(serviceId);

  const [activeTab, setActiveTab] = useState('data');
  const [selected,  setSelected]  = useState(null);

  if (!service) {
    return <View style={s.root}><Text style={{ padding: 20 }}>Service introuvable.</Text></View>;
  }

  const operator = OPERATORS[service.operator];
  const getForfaits = service.operator === 'yas' ? getYasForfaitsByTab : getMoovForfaitsByTab;
  const forfaits = getForfaits(activeTab);

  const handleConfirmPin = (pin) => {
    if (!selected) return;
    const code = resolveUSSD(selected.ussdTemplate, { pin });
    setSelected(null);
    dialUSSD(code);
  };

  // Pour les forfaits EXPRESS (code direct sans template), on dial direct.
  // Sinon (template avec {pin}), on ouvre le PinPromptDialog.
  const handleForfaitPress = (item) => {
    if (item.express && item.ussd) {
      dialUSSD(item.ussd);
    } else {
      setSelected(item);
    }
  };

  const heroGrad = service.operator === 'yas'
    ? ['#FFB100', '#E89900']
    : ['#0066B3', '#004A88'];

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.headerBar}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <ArrowLeft size={20} color={COLORS.black} strokeWidth={2.2} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Achat de Forfaits</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={forfaits}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={s.forfaitRow} onPress={() => handleForfaitPress(item)} activeOpacity={0.75}>
            <View style={[s.opBadge, { backgroundColor: operator?.color + '20' }]}>
              <Text style={[s.opBadgeTxt, { color: operator?.color }]}>{operator?.short}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.forfaitLabel}>{item.label}</Text>
              <Text style={s.forfaitMeta}>Validité : {item.validity}</Text>
              {item.extraInfo && (
                <Text style={s.forfaitExtra} numberOfLines={1}>✨ {item.extraInfo}</Text>
              )}
            </View>
            <View style={s.priceBox}>
              <Text style={s.priceVal}>{item.price.toLocaleString('fr-FR')}</Text>
              <Text style={s.priceCur}>F CFA</Text>
            </View>
          </TouchableOpacity>
        )}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        ListHeaderComponent={
          <>
            <LinearGradient
              colors={heroGrad}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.hero}
            >
              <View style={s.heroIcon}>
                <Signal size={22} color="#FFF" strokeWidth={2.2} />
              </View>
              <Text style={s.heroOver}>{operator?.label?.toUpperCase()}</Text>
              <Text style={s.heroTitle}>Achat de Forfaits</Text>
              <Text style={s.heroSub}>
                Tap sur un forfait → dialé en 1 clic depuis ton crédit. Pas de PIN sur les forfaits Net express.
              </Text>
            </LinearGradient>

            {/* Tabs DATA / APPEL / MIXTE / PROMO */}
            <View style={s.tabsBar}>
              {FORFAIT_TABS.map((tab) => {
                const on = activeTab === tab.id;
                return (
                  <TouchableOpacity
                    key={tab.id}
                    style={[s.tab, on && s.tabActive]}
                    onPress={() => setActiveTab(tab.id)}
                    activeOpacity={0.85}
                  >
                    <Text style={[s.tabTxt, on && s.tabTxtActive]}>{tab.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyTxt}>Aucun forfait disponible dans cette catégorie.</Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />

      <PinPromptDialog
        visible={!!selected}
        title="Confirme avec ton PIN Mobile Money"
        subtitle={selected ? `${selected.label} — ${selected.price.toLocaleString('fr-FR')} F` : ''}
        onClose={() => setSelected(null)}
        onConfirm={handleConfirmPin}
      />
    </View>
  );
}

const SHADOW = Platform.select({
  ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 10 },
  default: { elevation: 2 },
});

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },

  headerBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACE.md, paddingVertical: 10,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: '#FFF',
    alignItems: 'center', justifyContent: 'center', ...SHADOW,
  },
  headerTitle: { fontFamily: FONT, fontSize: 16, fontWeight: '800', color: COLORS.black },

  hero: {
    marginHorizontal: SPACE.lg, marginTop: 8, marginBottom: 12,
    borderRadius: 20, padding: 20, ...SHADOW,
  },
  heroIcon: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  heroOver:  { fontFamily: FONT, fontSize: 10, fontWeight: '700', letterSpacing: 1.5, color: 'rgba(255,255,255,0.85)', marginBottom: 4 },
  heroTitle: { fontFamily: FONT, fontSize: 22, fontWeight: '800', color: '#FFF', letterSpacing: -0.5, marginBottom: 6 },
  heroSub:   { fontFamily: FONT, fontSize: 12, color: 'rgba(255,255,255,0.85)', lineHeight: 17 },

  // Tabs
  tabsBar: {
    flexDirection: 'row',
    marginHorizontal: SPACE.lg, marginBottom: 14,
    backgroundColor: '#FFF', borderRadius: 14, padding: 4, ...SHADOW,
  },
  tab: {
    flex: 1, paddingVertical: 10, alignItems: 'center',
    borderRadius: 10,
  },
  tabActive: { backgroundColor: COLORS.black },
  tabTxt:       { fontFamily: FONT, fontSize: 11, fontWeight: '800', color: COLORS.grey, letterSpacing: 0.5 },
  tabTxtActive: { color: '#FFF' },

  // Forfait row
  forfaitRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FFF', marginHorizontal: SPACE.lg, marginBottom: 8,
    borderRadius: 14, padding: 14, ...SHADOW,
  },
  opBadge: {
    width: 42, height: 42, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  opBadgeTxt: { fontFamily: FONT, fontSize: 11, fontWeight: '800', letterSpacing: 0.3 },
  forfaitLabel: { fontFamily: FONT, fontSize: 14, fontWeight: '800', color: COLORS.black, letterSpacing: -0.2 },
  forfaitMeta:  { fontFamily: FONT, fontSize: 11, color: COLORS.grey, marginTop: 2 },
  forfaitExtra: { fontFamily: FONT, fontSize: 11, color: COLORS.gold, fontWeight: '600', marginTop: 2 },

  priceBox: { alignItems: 'flex-end' },
  priceVal: { fontFamily: FONT, fontSize: 15, fontWeight: '800', color: COLORS.black, letterSpacing: -0.3 },
  priceCur: { fontFamily: FONT, fontSize: 10, color: COLORS.grey, fontWeight: '600', marginTop: 1 },

  empty: { padding: 32, alignItems: 'center' },
  emptyTxt: { fontFamily: FONT, fontSize: 12, color: COLORS.grey, textAlign: 'center' },
});
