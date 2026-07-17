# LIKA — Cahier de Présentation

### Portefeuille électronique de proximité pour la zone Franc CFA
**Document de présentation à l'attention des institutions financières partenaires**

---

| | |
|---|---|
| **Produit** | Lika (LikaPay) — application mobile de paiement |
| **Version** | 1.0 |
| **Zone cible** | UEMOA (XOF) & CEMAC (XAF) — 14 pays |
| **Porteur de projet** | _[À compléter : nom, raison sociale, statut juridique]_ |
| **Contact** | _[Nom, téléphone, e-mail]_ |
| **Date** | Juin 2026 |
| **Confidentialité** | Document confidentiel — diffusion restreinte |

---

## 1. Résumé exécutif

**Lika** est une application mobile de paiement conçue pour la réalité du commerce de proximité en Afrique de l'Ouest et Centrale : régler un achat, **payer un reliquat (la monnaie)**, et transférer de petits montants entre particuliers, **même sans connexion Internet**.

Le cœur de l'innovation repose sur un système de **paiement hors-ligne par QR code chiffré** : le commerçant ou l'utilisateur génère un code sécurisé, l'autre partie le scanne, et la transaction s'effectue localement sur les deux appareils avant d'être synchronisée avec le serveur dès le retour de la connexion.

Pour opérer en conformité avec la réglementation de la **BCEAO/BEAC** sur la monnaie électronique, et pour sécuriser les fonds des utilisateurs, **Lika recherche un partenariat avec une institution financière agréée** (institution de microfinance / SFD, banque ou établissement de monnaie électronique). Ce partenariat constitue l'objet de la présente démarche.

> **Ce que nous apportons :** une technologie aboutie, une base d'utilisateurs cible mal desservie par les solutions existantes, et un canal de distribution numérique.
> **Ce que nous recherchons :** une couverture réglementaire, le cantonnement des fonds de la clientèle, et un cadre de conformité (KYC / LCB-FT).

---

## 2. Le contexte et le problème

### 2.1 Un quotidien marqué par le manque de monnaie
Dans le commerce informel et de proximité, l'absence de petite monnaie (« reliquat ») est une friction quotidienne : le client repart sans sa monnaie, ou le commerçant perd une vente. Les solutions de Mobile Money existantes sont souvent :
- **coûteuses** sur les petits montants (frais fixes proportionnellement élevés) ;
- **dépendantes du réseau** (USSD/data), inutilisables en zone de faible couverture ;
- **peu adaptées** au paiement instantané face-à-face de très petits montants.

### 2.2 Une population sous-bancarisée
La zone CFA présente un taux de bancarisation faible mais un taux d'équipement en téléphones mobiles élevé. Les institutions de microfinance jouent un rôle central pour l'inclusion financière, mais manquent souvent d'un **canal numérique de paiement de proximité** moderne.

### 2.3 L'opportunité
Lika se positionne précisément sur ce segment : **les micro-paiements de proximité, instantanés et hors-ligne**, en complément (et non en concurrence) du Mobile Money et des services d'une institution de microfinance.

---

## 3. La solution Lika

### 3.1 Principe de fonctionnement
1. **Génération d'un bloc de paiement** — l'utilisateur (ou le commerçant) saisit un montant et génère un **QR code chiffré**.
2. **Scan** — l'autre partie scanne le QR avec son application Lika.
3. **Règlement local** — la transaction est enregistrée immédiatement et hors-ligne dans le portefeuille des deux parties.
4. **Synchronisation** — dès le retour de la connexion, les opérations sont remontées et consolidées côté serveur.

### 3.2 Garde-fous intégrés (déjà implémentés)
- **Plafond par opération : 4 900 F CFA par QR.** Aucun utilisateur ne peut générer un bloc de paiement supérieur à ce montant — un mécanisme directement orienté maîtrise du risque et conformité aux paliers de monnaie électronique.
- **Validité limitée à 2 minutes par QR** — au-delà, le code expire et l'opération est automatiquement annulée (rollback du débit).
- **Vérification du solde** avant toute génération de QR.
- **Anti-rejeu (anti-replay)** : chaque opération porte un identifiant unique (nonce) à usage unique, mémorisé pour empêcher la réutilisation frauduleuse d'un même code.

### 3.3 Services complémentaires
Au-delà du paiement de proximité, l'application intègre :
- **Recharge et retrait** via Mobile Money (Orange Money, Moov, Wave — agrégation via prestataire de paiement) ;
- **Transferts entre utilisateurs** ;
- **Achat de crédit, de forfaits et paiement de factures** (services opérateurs) ;
- **Historique détaillé** des transactions.

---

## 4. Fonctionnalités clés

| Domaine | Fonctionnalité |
|---|---|
| **Paiement de proximité** | QR code chiffré hors-ligne, plafonné à 4 900 F, valable 2 min |
| **Portefeuille** | Solde temps réel, historique, détail par transaction |
| **Recharge / Retrait** | Mobile Money multi-opérateurs |
| **Transferts** | Entre utilisateurs Lika |
| **Services** | Crédit téléphonique, forfaits data, paiement de factures |
| **Multi-pays** | 14 pays — UEMOA (XOF) et CEMAC (XAF) |
| **Mode hors-ligne** | Fonctionnement sans réseau, synchronisation différée |
| **Sécurité d'accès** | Code PIN + authentification biométrique (empreinte / Face ID) |

---

## 5. Architecture technique & sécurité

### 5.1 Architecture générale
- **Application mobile** native (Android & iOS), développée avec une technologie multiplateforme moderne (React Native / Expo).
- **Base de données locale chiffrée** sur l'appareil : le portefeuille fonctionne de manière autonome hors-ligne.
- **Synchronisation serveur** sécurisée : consolidation des opérations, réconciliation du solde, gestion des reprises réseau (mécanisme de relance automatique).

### 5.2 Sécurité des transactions
| Mesure | Description |
|---|---|
| **Chiffrement** | Les QR de paiement sont chiffrés (AES-256) et signés (HMAC-SHA256) : illisibles et infalsifiables. |
| **Plafonnement** | 4 900 F CFA maximum par opération QR, contrôlé côté génération **et** côté lecture. |
| **Expiration** | Durée de vie d'un QR limitée à 2 minutes. |
| **Anti-rejeu** | Identifiant unique à usage unique par opération. |
| **Authentification forte** | PIN (haché) + biométrie ; re-authentification exigée sur les actions sensibles. |
| **Cantonnement** | _Objet du partenariat :_ logement des fonds clients sur un compte dédié auprès de l'institution. |

### 5.3 Protection des données
Stockage des secrets dans l'enclave sécurisée de l'appareil, communications chiffrées, et politique de confidentialité conforme aux usages. _(Le dispositif de conformité RGPD/loi nationale sur les données personnelles sera finalisé avec le partenaire.)_

---

## 6. Pourquoi un partenariat avec une institution financière ?

### 6.1 L'exigence réglementaire
Dans l'espace UEMOA, **l'émission de monnaie électronique et la détention de fonds de la clientèle sont des activités réglementées par la BCEAO** (notamment l'Instruction relative aux conditions d'exercice des émetteurs de monnaie électronique). Une fintech ne peut généralement **pas détenir directement les fonds du public** ; elle doit s'adosser à un établissement agréé :
- une **banque**,
- un **établissement de monnaie électronique (EME)**,
- ou une **institution de microfinance / Système Financier Décentralisé (SFD)** dans le cadre autorisé.

> _Les références réglementaires précises (textes BCEAO/BEAC, paliers KYC, plafonds d'encours et d'opérations) seront validées conjointement avec le service conformité du partenaire et un conseil juridique spécialisé._

### 6.2 Ce que la couverture apporte
- **Légitimité et conformité** : opérer dans un cadre légal sécurisé.
- **Confiance des utilisateurs** : fonds adossés à une institution agréée et régulée.
- **Sécurité des dépôts** : cantonnement des fonds de la clientèle sur un compte dédié.
- **Accès au système de paiement** : interconnexion avec les rails bancaires et Mobile Money.

### 6.3 Pertinence particulière pour une institution de microfinance
- **Acquisition numérique** : Lika devient un canal d'entrée moderne vers les services de l'institution.
- **Inclusion financière** : toucher une clientèle jeune, mobile et sous-bancarisée.
- **Réduction du cash** : moins de manipulation d'espèces, plus de traçabilité.
- **Données et cross-sell** : opportunités de micro-crédit, micro-épargne et autres produits.

---

## 7. Proposition de partenariat

### 7.1 Répartition des rôles (proposition de cadre)
| Lika (porteur de projet) | Institution financière partenaire |
|---|---|
| Technologie, application et maintenance | Agrément et couverture réglementaire |
| Acquisition et animation des utilisateurs | Cantonnement et garde des fonds clients |
| Support de niveau 1, expérience produit | Cadre KYC / LCB-FT et reporting réglementaire |
| Innovation et évolutions produit | Accès aux rails de paiement et compensation |

### 7.2 Modèles économiques envisageables
- **Partage des commissions** sur les opérations (recharge, retrait, services).
- **Forfait / abonnement** de mise à disposition de la plateforme.
- **Co-construction** de produits financiers (épargne, crédit) distribués via l'application.

> Les modalités précises (clé de répartition, exclusivité, durée, gouvernance) sont **ouvertes à la discussion** et seront formalisées par convention.

### 7.3 Conformité — engagements de Lika
- Respect des **paliers KYC** : identification progressive des utilisateurs selon les seuils.
- **Plafonds d'opération et d'encours** paramétrables selon les exigences du partenaire (le plafond de 4 900 F/QR est un premier garde-fou natif).
- Dispositifs **LCB-FT** (lutte contre le blanchiment et le financement du terrorisme) : détection des opérations atypiques, traçabilité complète, reporting.
- Mise à disposition des **journaux et états** requis par la conformité du partenaire.

---

## 8. Avantages concurrentiels

1. **Le paiement hors-ligne** : différenciateur majeur en zone de faible couverture réseau.
2. **Le micro-paiement instantané** de proximité, optimisé pour les très petits montants et le reliquat.
3. **Une expérience simple**, pensée pour une clientèle peu familière des outils numériques.
4. **Une base technologique déjà construite et fonctionnelle**, prête à être adossée à un partenaire.
5. **Sécurité de niveau bancaire** sur les opérations (chiffrement, anti-rejeu, authentification forte).

---

## 9. État d'avancement & feuille de route

### 9.1 Déjà réalisé
- Application mobile fonctionnelle (Android / iOS).
- Moteur de paiement QR chiffré hors-ligne + synchronisation serveur.
- Portefeuille local, historique, gestion multi-pays CFA.
- Recharge / retrait Mobile Money, transferts, services opérateurs.
- Sécurité : PIN, biométrie, plafond 4 900 F, expiration 2 min, anti-rejeu.

### 9.2 À finaliser avec le partenaire
- Intégration du **cantonnement des fonds** et des comptes clients.
- Déploiement du **dispositif KYC / LCB-FT** complet.
- Intégration de l'**agrégateur de paiement** en production.
- Tests de bout en bout, audit de sécurité, et **mise en production**.

### 9.3 Phases proposées
1. **Phase 1 — Cadrage** (signature d'un accord de principe, due diligence).
2. **Phase 2 — Intégration** (raccordement technique, conformité).
3. **Phase 3 — Pilote** (déploiement restreint, périmètre contrôlé).
4. **Phase 4 — Lancement** (montée en charge progressive).

---

## 10. Notre demande

Nous sollicitons une **rencontre de travail** afin de :
1. Présenter une **démonstration en direct** de l'application.
2. Évaluer ensemble la **faisabilité réglementaire** du partenariat.
3. Définir un **cadre de collaboration** et un projet pilote.

---

## 11. Annexes (à fournir lors de la rencontre)

- Démonstration de l'application (appareil de test).
- Schéma d'architecture technique détaillé.
- Maquettes des principaux écrans.
- Projet de modèle économique chiffré.
- Documents juridiques du porteur de projet.

---

> **Avertissement.** Le présent document est une présentation commerciale. Les éléments réglementaires (textes BCEAO/BEAC, agréments, paliers KYC, plafonds) y sont rappelés à titre indicatif et **doivent être confirmés par le service conformité de l'institution partenaire et un conseil juridique spécialisé** avant tout engagement.

---

*Document confidentiel — Lika, 2026. Toute reproduction sans autorisation est interdite.*
