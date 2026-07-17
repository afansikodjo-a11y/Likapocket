/**
 * Complète le dist/index.html généré par `expo export --platform web`.
 *
 * Pourquoi ce script existe : Expo (Metro, SDK 56) n'injecte dans index.html
 * que title/lang/theme-color/description/favicon à partir de `expo.web` —
 * pas de <link rel="manifest">, ni de balises apple-mobile-web-app-*
 * nécessaires à iOS Safari (vérifié en inspectant un export réel : aucune
 * de ces balises n'apparaît). Un public/index.html personnalisé REMPLACE
 * entièrement le template de Metro (perte du <script> vers le bundle JS
 * hashé) — donc on patche le fichier généré après coup plutôt que de le
 * remplacer.
 *
 * Usage : node scripts/patch-web-build.js   (après `expo export --platform web`)
 */

const fs   = require('fs');
const path = require('path');

const DIST_INDEX = path.resolve(__dirname, '..', 'dist', 'index.html');

if (!fs.existsSync(DIST_INDEX)) {
  console.error(`❌ ${DIST_INDEX} introuvable — lance d'abord \`npm run build:web\`.`);
  process.exit(1);
}

let html = fs.readFileSync(DIST_INDEX, 'utf8');

if (html.includes('rel="manifest"')) {
  console.log('ℹ️  index.html déjà patché, rien à faire.');
  process.exit(0);
}

const tags = [
  '<link rel="manifest" href="/manifest.json">',
  '<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">',
  '<meta name="apple-mobile-web-app-capable" content="yes">',
  '<meta name="apple-mobile-web-app-status-bar-style" content="default">',
  '<meta name="apple-mobile-web-app-title" content="LikaPay">',
].join('\n');

html = html.replace('</head>', `${tags}\n</head>`);

fs.writeFileSync(DIST_INDEX, html);
console.log('✅ dist/index.html patché (manifest + balises iOS PWA).');
