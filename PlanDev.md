# LikaPocket — Plan de développement

## 1. Infrastructure de base
- ~~Init projet Expo SDK 56 + dépendances~~
- ~~Structure dossiers (src/screens, src/database, src/services, src/crypto, src/theme)~~
- ~~Système de design : palette or #D69E4E, typographie, espacements~~
- ~~metro.config.js : désactiver unstable_enablePackageExports (fix lucide-react-native)~~
- ~~Stubs web (.web.js) pour modules natifs (SQLite, SecureStore, expo-network)~~

## 2. Base de données locale (SQLite)
- ~~Schéma v3 : tables wallet, transactions (UUID, types COLLECT/TRANSFER/TOPUP/WITHDRAW), seen_nonces~~
- ~~walletService : getBalance, credit, debit, creditFromQR, debitForTransfer~~
- ~~Anti-replay : nonce stocké dans seen_nonces (TTL 10 min)~~
- ~~Migration v2 → v3~~
- ~~Mock web (index.web.js) avec données réalistes~~

## 3. Chiffrement & QR
- ~~AES-256-CBC + HMAC-SHA256 (crypto-js)~~
- ~~Payload : { mid, mname, amt, cur, ts, nonce, v:1 }~~
- ~~Validation : intégrité HMAC → déchiffrement → schéma → expiry (5 min) → clock skew~~
- ~~encryptQRPayload / decryptQRPayload~~

## 4. Authentification
- ~~Supabase client — SecureStore (natif) / localStorage (web) selon Platform.OS~~
- ~~AuthScreen : email + OTP téléphone (refonte card-based)~~
- ~~14 pays Franc CFA : UEMOA (XOF) + CEMAC (XAF)~~
- ~~AppNavigator conditionnel (auth stack / app stack)~~
- ~~Fallback timeout 3 s si getSession() bloque~~
- ~~Fix spinner infini sur web (Platform.OS === 'web' → localStorage)~~

## 5. Écrans principaux
- ~~HomeScreen : solde, boutons d'action, grille 2×2, liste transactions (card-based)~~
- ~~MerchantScreen : génération QR chiffré avec compte à rebours 5 min~~
- ~~ScanScreen : scan QR, déchiffrement, confirmation, creditFromQR~~
- ~~HistoryScreen : liste complète des transactions~~

## 6. Synchronisation Supabase
- ~~Créer tables côté Supabase : `wallets`, `transactions`~~
- ~~Configurer RLS (Row Level Security)~~
- ~~syncService : push PENDING_SYNC → Supabase → marquer VALIDATED~~
- ~~Réconciliation du solde avec le serveur~~
- ~~startNetworkListener : polling toutes les 30 s~~
- Tester le cycle complet sync offline → online

## 7. Paiements Mobile Money
- ~~Interface PaymentProvider (Orange Money, Moov, Wave, Carte)~~
- ~~initiateTopUp : crédite SQLite + crée request Supabase~~
- ~~initiateWithdraw : débite SQLite d'abord, rollback si erreur~~
- ~~TransferScreen unifié (recharge + retrait) avec sélecteur de provider, quick amounts, success state~~
- ~~Table Supabase `payment_requests` + RLS~~
- ~~UI restructurée : Méthode (Mobile Money / Carte) + sous-sélecteur opérateur~~
- ~~Carte désactivée avec badge "BIENTÔT"~~
- **Intégration Moneroo** (agrégateur multi-opérateur Afrique Ouest)
  - Créer compte Moneroo + récupérer API key sandbox/prod
  - Supabase Edge Function : proxy sécurisé (API key côté serveur uniquement)
  - Mapper `payment_requests` PENDING → call Moneroo
  - Webhook Moneroo → CONFIRMED ou FAILED
  - Test sandbox : Orange Money, Wave, Moov, MTN
- Intégration Carte (Stripe ou Moneroo Carte) — plus tard

## 8. Écrans secondaires & Architecture
- ~~Zustand store (session, balance, pendingCount, refreshWallet)~~
- ~~Tab Navigation bottom (Accueil / Scanner / Mon QR / Historique)~~
- ~~Dashboard card-based (LinearGradient, grille 2×2, activité récente)~~
- ~~Écran Profil utilisateur (identity card, sections compte/sécurité/préférences/support, déconnexion)~~
- ~~Onboarding 3 slides (reliquat / offline / Mobile Money) avec flag premier lancement~~
- ~~Profil entièrement éditable (Nom, Téléphone, Pays, Langue, Notifications via user_metadata Supabase)~~
- ~~EditFieldModal réutilisable (text/phone/country/choices)~~
- ~~Pull-to-refresh sur Accueil + Historique~~
- ~~Modale détail transaction au tap~~
- ~~Renommage onglets Recevoir / Envoyer pour clarté Send/Receive~~
- **i18n FR + EN** (i18n-js + extraction des ~150 strings + traduction)

## 9. Sécurité & robustesse
- ~~Validation côté client avant chaque transaction (vérification solde dans MerchantScreen avant débit + génération QR)~~
- ~~Gestion des erreurs réseau (retry avec backoff exponentiel 30s→5min dans syncService)~~
- ~~PIN (SHA-256 hashé en SecureStore) + biométrie (expo-local-authentication) + verrouillage au lancement~~
- ~~SecurityPrompt réutilisable pour re-authentification sur actions sensibles (Envoyer, modifier profil)~~
- Rate limiting côté Supabase

## 10. Tests & qualité
- Tests sur Expo Go (Android & iOS)
- Tests flux QR end-to-end (deux appareils)
- Tests mode hors-ligne
- Vérification sur les 14 pays CFA

## 11. Déploiement
- Build Android (EAS Build)
- Build iOS (EAS Build)
- Soumission Google Play Store
- Soumission Apple App Store
