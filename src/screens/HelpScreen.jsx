import { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, Platform, Linking, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft, HelpCircle, ChevronDown, ChevronRight,
  Mail, Phone, Rocket, ShieldCheck, AlertTriangle,
} from 'lucide-react-native';
import { openWhatsAppToAdmin, ADMIN_WHATSAPP, ADMIN_EMAIL } from '../config/admin';
import { COLORS, FONT, SPACE } from '../theme';

// ── Contenu de la FAQ ──────────────────────────────────────────────────────

const SECTIONS = [
  {
    key:   'start',
    title: 'Démarrage rapide',
    icon:  Rocket,
    color: COLORS.gold,
    bg:    COLORS.goldSoft,
    items: [
      {
        q: 'Comment recharger mon compte ?',
        a: `Va dans Profil → Recharger. Choisis "Recharge interne", entre le montant souhaité puis confirme. Tu seras redirigé vers WhatsApp pour échanger avec l'administrateur sur le moyen de règlement (Mobile Money, espèces, virement). Une fois le paiement reçu, l'admin valide la recharge et ton solde est crédité.`,
      },
      {
        q: 'Comment recevoir un reliquat ?',
        a: `Va dans l'onglet "Recevoir" et autorise l'accès à la caméra. Scanne le QR code généré par le marchand. Le montant est crédité automatiquement dans ton portefeuille (en attente de synchronisation si tu es hors-ligne).`,
      },
      {
        q: 'Comment envoyer de l\'argent ?',
        a: `Va dans l'onglet "Envoyer", entre le montant à envoyer puis appuie sur "Générer le QR Code". Présente le QR à ton destinataire qui le scannera avec son application. Tu dois avoir le solde suffisant — il sera débité immédiatement et restauré si le QR expire sans être scanné.`,
      },
      {
        q: 'Comment retirer mon argent ?',
        a: `Va dans Profil → Retirer. Choisis "Retrait interne", entre le montant et ton numéro destinataire (Mobile Money), puis confirme. Tu seras redirigé vers WhatsApp pour préciser les coordonnées de réception. Après validation par l'admin, ton solde est débité et l'argent envoyé.`,
      },
    ],
  },
  {
    key:   'security',
    title: 'Sécurité',
    icon:  ShieldCheck,
    color: COLORS.success,
    bg:    COLORS.successSoft,
    items: [
      {
        q: 'Comment activer le code PIN ?',
        a: `Va dans Profil → Sécurité → Code PIN. Crée un code à 4 chiffres puis confirme-le. Une fois activé, ton PIN sera demandé à chaque ouverture de l'app et pour toute opération sensible (envoi, modification du profil).`,
      },
      {
        q: 'Comment activer la biométrie ?',
        a: `Active d'abord le code PIN, puis dans Profil → Sécurité, active "Face ID" ou "Empreinte digitale" selon ton appareil. La biométrie remplace la saisie du PIN pour plus de rapidité.`,
      },
      {
        q: 'Mon téléphone est volé, que faire ?',
        a: `1. Depuis un autre appareil, va sur l'app LikaPocket → écran de connexion → "Mot de passe oublié" pour réinitialiser. 2. Contacte l'administrateur sur WhatsApp pour bloquer ton compte. 3. Si tu avais activé le PIN/biométrie, ton solde est protégé contre l'accès non autorisé.`,
      },
      {
        q: 'Mon argent est-il en sécurité ?',
        a: `Oui. Toutes les transactions QR sont chiffrées en AES-256 + signature HMAC-SHA256. Tes données sont stockées localement (SQLite chiffré) et synchronisées avec Supabase (hébergement européen, conforme RGPD). Tes clés (PIN, mot de passe) ne quittent jamais ton appareil.`,
      },
      {
        q: 'Pourquoi le QR expire après 2 minutes ?',
        a: `C'est une mesure anti-fraude. Un QR avec une longue durée de validité pourrait être photographié, dupliqué et utilisé plusieurs fois. La courte durée force chaque transaction à être unique et immédiate.`,
      },
    ],
  },
  {
    key:   'issues',
    title: 'Problèmes courants',
    icon:  AlertTriangle,
    color: COLORS.warning,
    bg:    COLORS.warningSoft,
    items: [
      {
        q: 'Le scan QR ne fonctionne pas',
        a: `Vérifie que tu as autorisé l'accès à la caméra : Paramètres → Applications → LikaPocket → Autorisations → Caméra. Assure-toi aussi que tu es en bonne lumière et que le QR n'est pas flou ou trop loin.`,
      },
      {
        q: 'Mon solde ne se met pas à jour après une recharge',
        a: `Sur le Dashboard, tire vers le bas pour forcer une synchronisation. Si le solde reste inchangé après 1 minute, vérifie ta connexion Internet. Si le problème persiste, contacte l'administrateur sur WhatsApp.`,
      },
      {
        q: 'Le QR scanné dit "déjà utilisé"',
        a: `Un QR ne peut être scanné qu'une seule fois pour des raisons de sécurité (protection contre les replays). Demande au marchand de générer un nouveau QR (il en a 2 minutes pour le faire).`,
      },
      {
        q: 'J\'ai oublié mon mot de passe',
        a: `Sur l'écran de connexion, clique sur "Mot de passe oublié ?", saisis ton email puis suis le lien reçu par mail pour définir un nouveau mot de passe.`,
      },
      {
        q: 'L\'application est lente ou plante',
        a: `Ferme et redémarre l'application. Si le problème persiste, vide le cache de l'app : Paramètres → Applications → LikaPocket → Stockage → Vider le cache. Aucune donnée ne sera perdue.`,
      },
    ],
  },
];

// ── FAQ Accordion item ─────────────────────────────────────────────────────

function FAQItem({ item, isOpen, onToggle }) {
  return (
    <View style={s.faqCard}>
      <TouchableOpacity style={s.faqHeader} onPress={onToggle} activeOpacity={0.7}>
        <Text style={s.faqQuestion}>{item.q}</Text>
        {isOpen
          ? <ChevronDown  size={16} color={COLORS.gold} strokeWidth={2.5} />
          : <ChevronRight size={16} color={COLORS.grey} strokeWidth={2.5} />}
      </TouchableOpacity>
      {isOpen && (
        <Text style={s.faqAnswer}>{item.a}</Text>
      )}
    </View>
  );
}

// ── Section header ─────────────────────────────────────────────────────────

function SectionBlock({ section, openKey, setOpenKey }) {
  const Icon = section.icon;
  return (
    <View style={s.section}>
      <View style={s.sectionHeader}>
        <View style={[s.sectionIcon, { backgroundColor: section.bg }]}>
          <Icon size={18} color={section.color} strokeWidth={2.2} />
        </View>
        <Text style={s.sectionTitle}>{section.title}</Text>
      </View>
      {section.items.map((item, i) => {
        const key = `${section.key}-${i}`;
        return (
          <FAQItem
            key={key}
            item={item}
            isOpen={openKey === key}
            onToggle={() => setOpenKey(openKey === key ? null : key)}
          />
        );
      })}
    </View>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────

export default function HelpScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [openKey, setOpenKey] = useState(null);

  const contactEmail = () => {
    Linking.openURL(`mailto:${ADMIN_EMAIL}?subject=${encodeURIComponent('Support LikaPocket')}`)
      .catch(() => Alert.alert('Erreur', `Contactez ${ADMIN_EMAIL}`));
  };

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.headerBar}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <ArrowLeft size={20} color={COLORS.black} strokeWidth={2.2} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Centre d'aide</Text>
        <View style={{ width: 40 }} />
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
            <HelpCircle size={22} color="#FFF" strokeWidth={2.2} />
          </View>
          <Text style={s.heroOver}>NOUS SOMMES LÀ POUR TOI</Text>
          <Text style={s.heroTitle}>Comment pouvons-nous aider ?</Text>
          <Text style={s.heroSub}>
            Tu trouveras ci-dessous les réponses aux questions les plus courantes. Sinon, contacte-nous directement.
          </Text>
        </LinearGradient>

        {/* FAQ sections */}
        {SECTIONS.map((section) => (
          <SectionBlock
            key={section.key}
            section={section}
            openKey={openKey}
            setOpenKey={setOpenKey}
          />
        ))}

        {/* Contact */}
        <View style={s.contactSection}>
          <Text style={s.contactTitle}>Besoin d'aide en direct ?</Text>
          <Text style={s.contactSub}>Notre équipe te répond sous 24h ouvrées.</Text>

          <TouchableOpacity
            style={s.waBtn}
            activeOpacity={0.85}
            onPress={() => openWhatsAppToAdmin(
              `Bonjour, j'ai besoin d'aide concernant LikaPocket.\n\n(Décris ton problème ici)`,
            )}
          >
            <Phone size={18} color="#FFF" strokeWidth={2.4} />
            <View>
              <Text style={s.waTxt}>WhatsApp</Text>
              <Text style={s.waSub}>+{ADMIN_WHATSAPP}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={s.emailBtn} activeOpacity={0.85} onPress={contactEmail}>
            <Mail size={18} color={COLORS.black} strokeWidth={2.4} />
            <View>
              <Text style={s.emailTxt}>Email</Text>
              <Text style={s.emailSub}>{ADMIN_EMAIL}</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const RADIUS = 16;
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

  // Hero
  hero: {
    marginHorizontal: SPACE.lg, marginTop: 8, marginBottom: 20,
    borderRadius: 20, padding: 20, ...SHADOW,
  },
  heroIcon: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  heroOver:  { fontFamily: FONT, fontSize: 10, fontWeight: '700', letterSpacing: 1.5, color: 'rgba(255,255,255,0.85)', marginBottom: 4 },
  heroTitle: { fontFamily: FONT, fontSize: 22, fontWeight: '800', color: '#FFF', letterSpacing: -0.5, marginBottom: 6 },
  heroSub:   { fontFamily: FONT, fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 18 },

  // Section
  section: { paddingHorizontal: SPACE.lg, marginBottom: 12 },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginBottom: 10, paddingHorizontal: 4,
  },
  sectionIcon: {
    width: 32, height: 32, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  sectionTitle: { fontFamily: FONT, fontSize: 14, fontWeight: '800', color: COLORS.black, letterSpacing: -0.2 },

  // FAQ card
  faqCard: {
    backgroundColor: '#FFF', borderRadius: RADIUS,
    marginBottom: 8, paddingHorizontal: 14, paddingVertical: 4, ...SHADOW,
  },
  faqHeader:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, gap: 12 },
  faqQuestion: { flex: 1, fontFamily: FONT, fontSize: 13, fontWeight: '700', color: COLORS.black, lineHeight: 19 },
  faqAnswer:   { fontFamily: FONT, fontSize: 12, color: COLORS.grey, lineHeight: 20, paddingBottom: 14, paddingTop: 2, paddingRight: 8 },

  // Contact section
  contactSection:  { paddingHorizontal: SPACE.lg, marginTop: 16 },
  contactTitle:    { fontFamily: FONT, fontSize: 16, fontWeight: '800', color: COLORS.black, marginBottom: 4 },
  contactSub:      { fontFamily: FONT, fontSize: 12, color: COLORS.grey, marginBottom: 16 },

  waBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#25D366', borderRadius: 14, padding: 14, marginBottom: 10, ...SHADOW,
  },
  waTxt:    { fontFamily: FONT, fontSize: 14, fontWeight: '800', color: '#FFF' },
  waSub:    { fontFamily: FONT, fontSize: 11, color: 'rgba(255,255,255,0.85)', marginTop: 1 },

  emailBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#FFF', borderRadius: 14, padding: 14, ...SHADOW,
  },
  emailTxt: { fontFamily: FONT, fontSize: 14, fontWeight: '800', color: COLORS.black },
  emailSub: { fontFamily: FONT, fontSize: 11, color: COLORS.grey, marginTop: 1 },
});
