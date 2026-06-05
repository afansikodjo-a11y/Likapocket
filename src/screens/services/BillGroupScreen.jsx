import {
  View, Text, TouchableOpacity, FlatList,
  StyleSheet, Platform, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft, ChevronRight,
  Zap, Droplet, Tv, Wifi, BatteryCharging, Shield, Sun,
} from 'lucide-react-native';
import { getBillGroup, getBillService } from '../../data/billServices';
import { COLORS, FONT, SPACE } from '../../theme';

const ICONS = {
  zap:               Zap,
  droplet:           Droplet,
  tv:                Tv,
  wifi:              Wifi,
  'battery-charging': BatteryCharging,
  shield:            Shield,
  sun:               Sun,
};

/**
 * Écran de listing des bills d'un groupe (ex: "Factures Eau et Électricité",
 * "Compteurs Prépayés"). Chaque tap ouvre BillActionScreen pour saisir
 * référence/montant/PIN.
 */
export default function BillGroupScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { groupId } = route.params;
  const group = getBillGroup(groupId);

  if (!group) {
    return <View style={s.root}><Text style={{ padding: 20 }}>Groupe introuvable.</Text></View>;
  }

  const HeroIcon = ICONS[group.icon] ?? Zap;
  const bills = group.bills.map(getBillService).filter(Boolean);

  const isBillActivated = (bill) => {
    // Un bill est activé si AUCUN opérateur n'a needsValidation: true
    // (autrement dit : le format USSD est validé pour au moins Yas).
    // En pratique on regarde Yas car c'est ce qu'on cible en premier.
    const yasInactive = bill.yas?.needsValidation === true;
    return !yasInactive;
  };

  const handleBillPress = (bill) => {
    if (!isBillActivated(bill)) {
      Alert.alert(
        'Bientôt disponible',
        `${bill.label} est en cours de test. Il sera activé prochainement.`,
      );
      return;
    }
    navigation.navigate('BillAction', {
      serviceId: `facture-${bill.id.toLowerCase()}`,
      billTypeOverride: bill.id,
    });
  };

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.headerBar}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <ArrowLeft size={20} color={COLORS.black} strokeWidth={2.2} />
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>{group.label}</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={bills}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const Icon = ICONS[item.icon] ?? Zap;
          const activated = isBillActivated(item);
          return (
            <TouchableOpacity
              style={[s.row, !activated && s.rowInactive]}
              onPress={() => handleBillPress(item)}
              activeOpacity={0.75}
            >
              <View style={[s.icon, { backgroundColor: item.bg }]}>
                <Icon size={20} color={item.color} strokeWidth={2.2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.label} numberOfLines={1}>{item.label}</Text>
                {activated ? (
                  <Text style={s.desc} numberOfLines={2}>{item.description}</Text>
                ) : (
                  <View style={s.comingSoonRow}>
                    <View style={s.comingSoonDot} />
                    <Text style={s.comingSoonTxt}>Bientôt disponible</Text>
                  </View>
                )}
              </View>
              <ChevronRight size={16} color={COLORS.greyLight} strokeWidth={2.2} />
            </TouchableOpacity>
          );
        }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        ListHeaderComponent={
          <LinearGradient
            colors={[group.color, _darken(group.color)]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.hero}
          >
            <View style={s.heroIcon}>
              <HeroIcon size={22} color="#FFF" strokeWidth={2.2} />
            </View>
            <Text style={s.heroOver}>FACTURES · TOGO</Text>
            <Text style={s.heroTitle}>{group.label}</Text>
            <Text style={s.heroSub}>{group.description}</Text>
          </LinearGradient>
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

function _darken(hex) {
  const c = hex.replace('#', '');
  const r = Math.max(0, parseInt(c.slice(0, 2), 16) - 30);
  const g = Math.max(0, parseInt(c.slice(2, 4), 16) - 30);
  const b = Math.max(0, parseInt(c.slice(4, 6), 16) - 30);
  return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
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
  headerTitle: { flex: 1, textAlign: 'center', fontFamily: FONT, fontSize: 16, fontWeight: '800', color: COLORS.black },

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
  heroTitle: { fontFamily: FONT, fontSize: 22, fontWeight: '800', color: '#FFF', letterSpacing: -0.5, marginBottom: 6 },
  heroSub:   { fontFamily: FONT, fontSize: 12, color: 'rgba(255,255,255,0.85)', lineHeight: 17 },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FFF', marginHorizontal: SPACE.lg, marginBottom: 8,
    borderRadius: 14, padding: 14, ...SHADOW,
  },
  rowInactive: { opacity: 0.65 },
  icon: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  label: { fontFamily: FONT, fontSize: 13, fontWeight: '700', color: COLORS.black, marginBottom: 2 },
  desc:  { fontFamily: FONT, fontSize: 11, color: COLORS.grey, lineHeight: 15 },

  comingSoonRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  comingSoonDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.warning },
  comingSoonTxt: { fontFamily: FONT, fontSize: 11, fontWeight: '700', color: COLORS.warning, letterSpacing: 0.3 },
});
