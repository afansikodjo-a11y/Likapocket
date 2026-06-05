import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, FlatList,
  StyleSheet, Platform, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft, ChevronRight, Wallet, PhoneCall, Signal, FileText,
  Zap, Droplet, Tv, Wifi, Smartphone, BatteryCharging, Shield, Sun,
} from 'lucide-react-native';
import {
  getCategory, getServicesByCategory, OPERATORS, isServiceActivated,
} from '../data/servicesTG';
import { detectOperator } from '../services/operatorDetection';
import { dialUSSD, resolveUSSD } from '../services/ussdHelper';
import USSDActionModal from '../components/USSDActionModal';
import PinPromptDialog from '../components/PinPromptDialog';
import { COLORS, FONT, SPACE } from '../theme';

// Map des icônes par catégorie
const CATEGORY_ICONS = {
  momo:    Wallet,
  credit:  PhoneCall,
  forfait: Signal,
  facture: FileText,
};

// Map nom Lucide → composant pour les services qui spécifient leur propre icône
const SERVICE_ICONS = {
  zap:                Zap,
  droplet:            Droplet,
  tv:                 Tv,
  wifi:               Wifi,
  smartphone:         Smartphone,
  'battery-charging': BatteryCharging,
  shield:             Shield,
  sun:                Sun,
};

// ── Service row ────────────────────────────────────────────────────────────

function ServiceRow({ service, onPress }) {
  const op = service.operator ? OPERATORS[service.operator] : null;
  const Icon = service.icon ? SERVICE_ICONS[service.icon] : null;
  const activated = isServiceActivated(service);

  return (
    <TouchableOpacity
      style={[s.serviceRow, !activated && s.serviceRowInactive]}
      onPress={() => onPress(service)}
      activeOpacity={0.75}
    >
      {Icon ? (
        <View style={[s.serviceIcon, { backgroundColor: service.bg ?? COLORS.greySoft }]}>
          <Icon size={20} color={service.color ?? COLORS.grey} strokeWidth={2.2} />
        </View>
      ) : op ? (
        <View style={[s.opBadge, { backgroundColor: op.color + '20' }]}>
          <Text style={[s.opBadgeTxt, { color: op.color }]}>{op.short}</Text>
        </View>
      ) : (
        <View style={[s.opBadge, { backgroundColor: COLORS.greySoft }]}>
          <Text style={[s.opBadgeTxt, { color: COLORS.grey }]}>—</Text>
        </View>
      )}
      <View style={s.serviceBody}>
        <Text style={s.serviceLabel} numberOfLines={1}>{service.label}</Text>
        {activated ? (
          <Text style={s.serviceDesc} numberOfLines={2}>{service.description}</Text>
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
}

// ── Main ──────────────────────────────────────────────────────────────────

export default function ServiceCategoryScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { categoryId } = route.params;
  const category = getCategory(categoryId);

  const [services,    setServices]    = useState([]);
  const [operator,    setOperator]    = useState(null);
  const [selected,    setSelected]    = useState(null);
  const [pinService,  setPinService]  = useState(null); // service en attente de saisie PIN

  // Charge l'opérateur puis filtre les services
  useEffect(() => {
    let mounted = true;
    detectOperator().then((op) => {
      if (!mounted) return;
      setOperator(op);
      setServices(getServicesByCategory(categoryId, op?.id));
    });
    return () => { mounted = false; };
  }, [categoryId]);

  // Routing par kind : écrans dédiés pour les opérations 1-shot, modal v1 sinon
  const handleServicePress = useCallback(async (service) => {
    // Service en test → bloquer le tap et informer l'user
    if (!isServiceActivated(service)) {
      Alert.alert(
        'Bientôt disponible',
        `${service.label} est en cours de test. Il sera activé prochainement.`,
      );
      return;
    }
    switch (service.kind) {
      case 'transfer':
        navigation.navigate('TransferAction', { serviceId: service.id });
        break;
      case 'topup-code':
        navigation.navigate('CreditAction', { serviceId: service.id });
        break;
      case 'forfait-purchase':
        navigation.navigate('ForfaitAction', { serviceId: service.id });
        break;
      case 'bill-pay':
        navigation.navigate('BillAction', { serviceId: service.id });
        break;
      case 'bill-group':
        navigation.navigate('BillGroup', { groupId: service.groupId });
        break;
      case 'merchant-pay':
        navigation.navigate('MerchantPayAction', { serviceId: service.id });
        break;
      case 'cash-out':
        navigation.navigate('WithdrawAction', { serviceId: service.id });
        break;
      case 'topup-self':
        navigation.navigate('TopupSelfAction', { serviceId: service.id });
        break;
      case 'topup-other':
        navigation.navigate('TopupOtherAction', { serviceId: service.id });
        break;
      case 'simple-dial':
      default:
        // Avec PIN requis → ouvre PinPromptDialog, puis dial USSD complet
        if (service.needsPin && service.ussdTemplate) {
          setPinService(service);
        } else if (!service.params || service.params.length === 0) {
          // Sans param ni PIN → dial direct (1-clic ACTION_CALL si permission OK)
          await dialUSSD(service.ussd);
        } else {
          // Avec params libres → modal v1 (cas de fallback)
          setSelected(service);
        }
    }
  }, [navigation]);

  const handlePinConfirm = useCallback(async (pin) => {
    if (!pinService) return;
    const code = resolveUSSD(pinService.ussdTemplate, { pin });
    setPinService(null);
    await dialUSSD(code);
  }, [pinService]);

  if (!category) {
    return (
      <View style={s.root}>
        <Text style={{ padding: 20 }}>Catégorie introuvable.</Text>
      </View>
    );
  }

  const Icon = CATEGORY_ICONS[category.id] ?? Wallet;
  const heroGrad = [category.color, _darken(category.color)];

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.headerBar}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <ArrowLeft size={20} color={COLORS.black} strokeWidth={2.2} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{category.label}</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={services}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ServiceRow service={item} onPress={handleServicePress} />}
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
                <Icon size={22} color="#FFF" strokeWidth={2.2} />
              </View>
              <Text style={s.heroOver}>SERVICES SIM · TOGO</Text>
              <Text style={s.heroTitle}>{category.label}</Text>
              <Text style={s.heroSub}>{category.description}</Text>

              {/* SIM détectée : un badge par SIM (limité à 1 via expo-cellular) */}
              <View style={s.simRow}>
                {operator && operator.id !== 'unknown' ? (
                  <View style={s.simBadge}>
                    <View style={s.simDot} />
                    <Text style={s.simTxt}>{operator.label}</Text>
                  </View>
                ) : (
                  <View style={[s.simBadge, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                    <Text style={s.simTxt}>SIM non détectée</Text>
                  </View>
                )}
              </View>
            </LinearGradient>

            <Text style={s.sectionLabel}>
              {services.length} service{services.length > 1 ? 's' : ''} disponible{services.length > 1 ? 's' : ''}
            </Text>
          </>
        }
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyTxt}>Aucun service disponible pour cette catégorie.</Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />

      <USSDActionModal
        visible={!!selected}
        service={selected}
        onClose={() => setSelected(null)}
      />

      <PinPromptDialog
        visible={!!pinService}
        title={pinService?.label ?? 'Code secret'}
        subtitle={pinService ? 'Saisis ton code secret Mobile Money pour finaliser l\'action en 1 seul appel USSD.' : ''}
        onClose={() => setPinService(null)}
        onConfirm={handlePinConfirm}
      />
    </View>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────

function _darken(hex) {
  // Assombri légèrement une couleur hex (~15%) pour le gradient
  const c = hex.replace('#', '');
  const r = Math.max(0, parseInt(c.slice(0, 2), 16) - 30);
  const g = Math.max(0, parseInt(c.slice(2, 4), 16) - 30);
  const b = Math.max(0, parseInt(c.slice(4, 6), 16) - 30);
  return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
}

// ── Styles ─────────────────────────────────────────────────────────────────

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

  simRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 14,
  },
  simBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5,
  },
  simDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: '#22C55E', // vert = connecté
  },
  simTxt: { fontFamily: FONT, fontSize: 10, fontWeight: '700', color: '#FFF', letterSpacing: 0.3 },

  sectionLabel: {
    fontFamily: FONT, fontSize: 10, fontWeight: '700', letterSpacing: 2,
    color: COLORS.grey, paddingHorizontal: SPACE.lg + 4, marginBottom: 10, marginTop: 4,
  },

  // Service row
  serviceRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FFF', marginHorizontal: SPACE.lg, marginBottom: 8,
    borderRadius: 14, padding: 14, ...SHADOW,
  },
  serviceRowInactive: { opacity: 0.65 },

  comingSoonRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  comingSoonDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.warning },
  comingSoonTxt: { fontFamily: FONT, fontSize: 11, fontWeight: '700', color: COLORS.warning, letterSpacing: 0.3 },
  opBadge: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  opBadgeTxt: { fontFamily: FONT, fontSize: 11, fontWeight: '800', letterSpacing: 0.3 },
  serviceIcon: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  serviceBody: { flex: 1 },
  serviceLabel: { fontFamily: FONT, fontSize: 13, fontWeight: '700', color: COLORS.black, marginBottom: 2 },
  serviceDesc:  { fontFamily: FONT, fontSize: 11, color: COLORS.grey, lineHeight: 15 },

  empty:    { paddingTop: 32, alignItems: 'center', paddingHorizontal: 32 },
  emptyTxt: { fontFamily: FONT, fontSize: 13, color: COLORS.grey, textAlign: 'center' },
});
