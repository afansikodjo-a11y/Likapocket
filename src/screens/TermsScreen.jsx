import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, FileText } from 'lucide-react-native';
import { COLORS, FONT, SPACE } from '../theme';

// Date de dernière mise à jour (à actualiser à chaque modification importante)
const LAST_UPDATE = '24 mai 2026';

// ── Contenu des CGU ────────────────────────────────────────────────────────

const ARTICLES = [
  {
    title: 'Article 1 — Objet du service',
    body: `LikaPay est un portefeuille électronique mobile permettant à ses utilisateurs de gérer des reliquats de monnaie, d'effectuer des paiements offline entre particuliers et marchands, et de recharger / retirer des fonds via des opérations Mobile Money ou virements.

Le service est édité et développé par NAMATECH, et destiné prioritairement aux utilisateurs des pays de la zone Franc CFA (UEMOA et CEMAC).

Contact éditeur :
   • Email : namatech01@gmail.com
   • WhatsApp : +228 91 28 25 90`,
  },
  {
    title: 'Article 2 — Inscription et compte',
    body: `2.1. L'inscription est ouverte aux personnes physiques majeures (18 ans ou plus) disposant de la capacité juridique de contracter.

2.2. L'utilisateur s'engage à fournir des informations exactes et à jour : adresse email valide ou numéro de téléphone vérifié par OTP.

2.3. Un seul compte par personne est autorisé. La création de comptes multiples peut entraîner leur suspension.

2.4. LikaPay se réserve le droit de refuser une inscription ou de suspendre un compte sans préavis en cas de soupçon de fraude, d'usurpation d'identité ou de violation des présentes conditions.`,
  },
  {
    title: 'Article 3 — Sécurité du compte',
    body: `3.1. L'utilisateur est seul responsable de la confidentialité de ses identifiants (email, mot de passe, code PIN, données biométriques).

3.2. En cas de perte ou de vol de son appareil, l'utilisateur doit immédiatement réinitialiser son mot de passe et contacter l'administrateur via WhatsApp pour bloquer son compte.

3.3. LikaPay recommande fortement l'activation du code PIN et/ou de la biométrie pour protéger les opérations sensibles.

3.4. Toute opération effectuée après authentification valide (PIN, biométrie ou session active) est réputée provenir du titulaire du compte.`,
  },
  {
    title: 'Article 4 — Opérations financières',
    body: `4.1. Les recharges et retraits sont soumis à validation par l'administrateur LikaPay dans un délai maximum de 24 heures ouvrées.

4.2. Les transactions de reliquat (envoi/réception de QR) sont instantanées et irrévocables une fois le QR scanné et validé.

4.3. Les limites suivantes s'appliquent (susceptibles d'évolution) :
   • Montant minimum par opération : 100 F CFA
   • Montant maximum par opération : 500 000 F CFA
   • Plafond cumulé journalier : 1 000 000 F CFA

4.4. Les fonds non encore validés par l'administrateur (statut "En attente") ne peuvent pas être utilisés pour d'autres opérations.`,
  },
  {
    title: 'Article 5 — Frais et tarifs',
    body: `5.1. La création et le maintien d'un compte LikaPay sont gratuits.

5.2. Les transactions peer-to-peer (envoi/réception de reliquats entre utilisateurs) sont gratuites.

5.3. Les recharges et retraits peuvent être assortis de frais de service, communiqués avant validation de l'opération. En phase pilote, ces frais sont nuls.

5.4. Les frais éventuels des opérateurs Mobile Money (Orange Money, Wave, Moov, etc.) ne sont pas inclus dans nos frais de service et restent à la charge de l'utilisateur.`,
  },
  {
    title: 'Article 6 — Limites de responsabilité',
    body: `6.1. LikaPay décline toute responsabilité en cas de partage volontaire d'un QR code par l'utilisateur (photographie, capture d'écran, transmission à un tiers non autorisé).

6.2. Les transactions confirmées par PIN ou biométrie sont réputées autorisées par l'utilisateur et sont irrévocables.

6.3. LikaPay n'est pas responsable des paiements effectués en dehors de l'application (espèces, virements, échanges WhatsApp avec l'administrateur) ni des éventuels litiges commerciaux entre utilisateurs.

6.4. Le service est fourni "tel quel". LikaPay ne garantit pas une disponibilité ininterrompue mais s'engage à assurer la meilleure continuité possible.`,
  },
  {
    title: 'Article 7 — Données personnelles',
    body: `7.1. LikaPay collecte les données suivantes : email, numéro de téléphone, nom complet (si renseigné), pays, historique des transactions, identifiant unique de l'appareil.

7.2. Ces données sont hébergées sur les serveurs Supabase situés en Europe (conformes RGPD).

7.3. Durée de conservation : 5 ans après la dernière activité du compte, conformément aux obligations comptables et légales.

7.4. L'utilisateur dispose à tout moment d'un droit d'accès, de rectification et de suppression de ses données. Ces demandes peuvent être adressées à l'administrateur via WhatsApp ou email.

7.5. Les données ne sont jamais vendues ni partagées à des tiers à des fins commerciales.`,
  },
  {
    title: 'Article 8 — Modification des conditions',
    body: `8.1. LikaPay se réserve le droit de modifier les présentes Conditions Générales d'Utilisation à tout moment.

8.2. Toute modification substantielle sera notifiée à l'utilisateur via une bannière dans l'application au moins 30 jours avant son entrée en vigueur.

8.3. La poursuite de l'utilisation du service au-delà de cette période vaut acceptation des nouvelles conditions. À défaut, l'utilisateur est libre de clôturer son compte.`,
  },
  {
    title: 'Article 9 — Résiliation',
    body: `9.1. L'utilisateur peut clôturer son compte à tout moment, à condition que son solde soit à 0 F CFA. La demande s'effectue via WhatsApp à l'administrateur.

9.2. LikaPay se réserve le droit de résilier un compte sans préavis en cas de :
   • Fraude avérée ou tentative de fraude
   • Violation grave des présentes conditions
   • Utilisation du service à des fins illégales
   • Inactivité prolongée (plus de 24 mois consécutifs)

9.3. En cas de résiliation par LikaPay, le solde du compte est restitué à l'utilisateur dans un délai de 30 jours, sauf en cas de fraude où il pourra être saisi à titre de réparation.`,
  },
  {
    title: 'Article 10 — Loi applicable et juridiction',
    body: `10.1. Les présentes Conditions Générales d'Utilisation sont soumises au droit togolais.

10.2. En cas de litige, les parties s'efforceront de trouver une solution amiable. À défaut, le tribunal compétent de Lomé sera seul saisi.

10.3. La nullité éventuelle d'une clause n'affecte pas la validité des autres clauses.`,
  },
];

// ── Main ───────────────────────────────────────────────────────────────────

export default function TermsScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.headerBar}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <ArrowLeft size={20} color={COLORS.black} strokeWidth={2.2} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Conditions d'utilisation</Text>
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
            <FileText size={22} color="#FFF" strokeWidth={2.2} />
          </View>
          <Text style={s.heroOver}>CGU · LIKAPOCKET</Text>
          <Text style={s.heroTitle}>Conditions Générales d'Utilisation</Text>
          <Text style={s.heroSub}>
            Dernière mise à jour : {LAST_UPDATE}
          </Text>
        </LinearGradient>

        {/* Preamble */}
        <View style={s.preambleCard}>
          <Text style={s.preambleTxt}>
            En utilisant LikaPay, tu acceptes les conditions suivantes. Nous t'invitons à les lire attentivement et à conserver une copie pour référence future.
          </Text>
        </View>

        {/* Articles */}
        {ARTICLES.map((article, i) => (
          <View key={i} style={s.articleCard}>
            <Text style={s.articleTitle}>{article.title}</Text>
            <Text style={s.articleBody}>{article.body}</Text>
          </View>
        ))}

        {/* Footer */}
        <View style={s.footer}>
          <Text style={s.footerTxt}>
            En continuant à utiliser LikaPay, tu confirmes avoir lu et accepté les présentes conditions.
          </Text>
          <Text style={s.footerVersion}>
            LikaPay · v1.0 · {LAST_UPDATE}{'\n'}
            Édité par NAMATECH
          </Text>
        </View>
      </ScrollView>
    </View>
  );
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
  heroTitle: { fontFamily: FONT, fontSize: 22, fontWeight: '800', color: '#FFF', letterSpacing: -0.5, marginBottom: 8 },
  heroSub:   { fontFamily: FONT, fontSize: 12, color: 'rgba(255,255,255,0.85)' },

  // Preamble
  preambleCard: {
    backgroundColor: COLORS.goldSoft, marginHorizontal: SPACE.lg, marginBottom: 16,
    borderRadius: 14, padding: 14,
  },
  preambleTxt: { fontFamily: FONT, fontSize: 12, color: COLORS.gold, fontWeight: '600', lineHeight: 18 },

  // Article
  articleCard: {
    backgroundColor: '#FFF', marginHorizontal: SPACE.lg, marginBottom: 10,
    borderRadius: 14, padding: 16, ...SHADOW,
  },
  articleTitle: { fontFamily: FONT, fontSize: 14, fontWeight: '800', color: COLORS.black, marginBottom: 10, letterSpacing: -0.2 },
  articleBody:  { fontFamily: FONT, fontSize: 12, color: COLORS.grey, lineHeight: 20 },

  // Footer
  footer: { paddingHorizontal: SPACE.lg, marginTop: 16, alignItems: 'center' },
  footerTxt: { fontFamily: FONT, fontSize: 11, color: COLORS.grey, textAlign: 'center', lineHeight: 17, marginBottom: 8 },
  footerVersion: { fontFamily: FONT, fontSize: 10, color: COLORS.greyLight, fontWeight: '600' },
});
