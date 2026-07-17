/**
 * Config Workbox pour le service worker web de LikaPocket.
 *
 * Scope volontairement limité à l'app shell (HTML, JS bundlé, manifest,
 * icônes) — aucune règle runtimeCaching pour Supabase : les appels réseau
 * (login, transactions, sync) passent toujours en direct, sans cache.
 * L'app peut donc s'ouvrir hors-ligne (dernière UI chargée), mais toute
 * action qui dépend de Supabase reste indisponible sans réseau — c'est le
 * comportement voulu pour la v1 ("app shell offline"), pas une limitation
 * à corriger.
 *
 * skipWaiting/clientsClaim restent désactivés (défaut Workbox) : un nouveau
 * build ne prend effet qu'après fermeture complète de tous les onglets
 * ouverts, ce qui évite qu'un onglet déjà ouvert tourne avec une UI à moitié
 * mise à jour. Compromis assumé — voir docs/WEB_PWA.md.
 */
module.exports = {
  globDirectory: 'dist',
  globPatterns: [
    'index.html',
    'manifest.json',
    'favicon.ico',
    '_expo/static/js/web/*.js',
    'icons/*.png',
    'assets/**/*.png',
  ],
  // Le build Metro place les icônes de navigation sous dist/assets/node_modules/...
  // (chemin de build, pas un vrai node_modules) — on retire l'exclusion par
  // défaut de Workbox pour ne pas les manquer, sans quoi le glob ci-dessus
  // ne matche silencieusement aucun fichier.
  globIgnores: ['sw.js', 'workbox-*.js'],
  // Le bundle JS principal (~3.3 Mo) dépasse la limite par défaut (2 Mo) de
  // Workbox et serait sinon exclu du cache app-shell — sans lui, l'app ne
  // peut pas du tout démarrer hors-ligne.
  maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
  swDest: 'dist/sw.js',
};
