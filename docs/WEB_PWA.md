# Version web (PWA)

LikaPocket est une seule base de code Expo servant le mobile natif (iOS/Android)
et le web. Le web n'est pas un projet séparé : les fichiers `*.web.js` déjà
présents dans `src/` (ex. `src/database/index.web.js`, `src/services/supabase.web.js`)
remplacent automatiquement leur équivalent natif au moment du build web.

## Développement local

```
npm run web
```

Lance `expo start --web` (Metro). Le rendu est encadré dans un gabarit
"téléphone" centré (`App.js`, branche `Platform.OS === 'web'`) — c'est un
choix volontaire, pas un bug.

## Build de production

```
npm run build:pwa
```

Enchaîne trois étapes :
1. `build:web` → `expo export --platform web`, sortie dans `dist/` (ignoré par git).
2. `patch:web` → `scripts/patch-web-build.js` complète `dist/index.html` avec
   `<link rel="manifest">` et les balises `apple-mobile-web-app-*` (iOS Safari
   ne lit pas le manifest pour ces infos). Nécessaire car Expo/Metro (SDK 56)
   n'injecte dans `index.html` que title/lang/theme-color/description/favicon
   à partir de `expo.web` — pas de balise manifest. Vérifié en inspectant un
   export réel, pas supposé depuis la doc.
3. `sw:generate` → génère `dist/sw.js` via Workbox (config dans `workbox-config.js`).

Prévisualiser le build en local (nécessite un contexte sécurisé pour le
service worker — pas de `file://`) :

```
npx serve dist
```

## `public/`

Le dossier `public/` à la racine est copié tel quel dans `dist/` par
`expo export`. Il contient :
- `manifest.json` (statique, ne dépend d'aucun nom de fichier hashé par le build)
- `icons/` (générées par `npm run pwa-icons`, voir plus bas)

Attention : ne jamais mettre de `public/index.html` — testé, ça **remplace**
entièrement le template généré par Metro et fait perdre le `<script>` vers le
bundle JS (dont le nom est hashé à chaque build). D'où le script de patch
post-export plutôt qu'un template statique.

## Icônes PWA

```
npm run pwa-icons
```

Régénère `public/icons/*` depuis les assets déjà produits par
`npm run icons` (`assets/icon.png`, `assets/android-icon-foreground.png`,
`assets/android-icon-background.png`) — pas besoin du logo source haute
résolution. Piège connu : le fichier source historique dans `assets/` s'appelle
`lika-logo-source.png.png` (double extension) ; `generate-pwa-icons.js` ne
l'utilise pas justement pour éviter ce problème.

## Service worker (offline "app shell" uniquement)

`workbox-config.js` précache l'app shell (HTML, bundle JS, manifest, icônes)
avec `maximumFileSizeToCacheInBytes` relevé à 6 Mo (le bundle principal fait
~3.3 Mo, au-delà de la limite par défaut de Workbox). Aucune règle
`runtimeCaching` n'est définie pour Supabase : les appels réseau (login,
transactions, synchro) passent toujours en direct. Résultat voulu : l'app
s'ouvre hors-ligne (dernière UI chargée), mais toute action nécessitant
Supabase reste indisponible sans réseau.

`skipWaiting`/`clientsClaim` restent désactivés : un nouveau déploiement ne
prend effet, pour un onglet déjà ouvert, qu'après fermeture complète de tous
les onglets. Compromis assumé pour éviter qu'un onglet tourne avec une UI à
moitié mise à jour.

## Déploiement Vercel

`vercel.json` : `buildCommand: npm run build:pwa`, `outputDirectory: dist`,
réécriture SPA (`/(.*) → /index.html`) pour que la navigation côté client
(React Navigation) ne 404 pas au rechargement, et `Cache-Control: no-cache`
forcé sur `/sw.js` et `/manifest.json` (sans ça, le bug PWA le plus courant :
un service worker mis en cache par le navigateur/CDN et jamais rafraîchi).

Variables d'environnement à définir dans le dashboard Vercel (nécessaires
**au build**, Expo/Metro les inline statiquement) :
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

Valeurs à copier depuis `eas.json` → `build.preview.env`.

## Limitation connue : coffres d'épargne sur web

`src/database/index.web.js` réimplémente la couche SQLite en `localStorage`
pour le web. C'est fonctionnellement isolé du SQLite natif : un coffre créé
sur web n'existe que dans ce navigateur, et inversement. Un bandeau
d'avertissement est affiché sur `FinanceScreen` et `SavingsGoalScreen` en web
pour prévenir l'utilisateur — corriger ce point (miroir Supabase partagé)
est un chantier à part, volontairement hors scope ici.
