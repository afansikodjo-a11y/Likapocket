/**
 * Génère les icônes PWA (web) de LikaPocket à partir des assets déjà générés
 * par scripts/generate-icons.js — ne dépend pas du logo source haute résolution.
 *
 * Usage :
 *   node scripts/generate-pwa-icons.js
 *
 * Prérequis (déjà présents dans assets/ après un `npm run icons`) :
 *   - assets/icon.png                     (1024×1024, fond doré opaque)
 *   - assets/android-icon-foreground.png  (1024×1024, symbole transparent, zone sûre)
 *   - assets/android-icon-background.png  (1024×1024, fond doré uni)
 *
 * Génère dans public/icons/ :
 *   - icon-192.png              (192×192)
 *   - icon-512.png              (512×512)
 *   - apple-touch-icon.png      (180×180, sans alpha)
 *   - icon-maskable-192.png     (192×192, purpose "maskable")
 *   - icon-maskable-512.png     (512×512, purpose "maskable")
 */

const sharp = require('sharp');
const path  = require('path');
const fs    = require('fs');

const ROOT       = path.resolve(__dirname, '..');
const ASSETS     = path.join(ROOT, 'assets');
const OUT_DIR    = path.join(ROOT, 'public', 'icons');

const ICON       = path.join(ASSETS, 'icon.png');
const FOREGROUND = path.join(ASSETS, 'android-icon-foreground.png');
const BACKGROUND = path.join(ASSETS, 'android-icon-background.png');

for (const p of [ICON, FOREGROUND, BACKGROUND]) {
  if (!fs.existsSync(p)) {
    console.error(`❌ Asset introuvable : ${p}`);
    console.error('   Lance d\'abord `npm run icons` pour générer les icônes de base.');
    process.exit(1);
  }
}

fs.mkdirSync(OUT_DIR, { recursive: true });

console.log('🎨 Génération des icônes PWA…\n');

async function maskableBuffer(size) {
  // Même logique que l'icône adaptive Android : symbole transparent
  // composité sur le fond doré uni, en conservant sa zone sûre existante.
  return sharp(BACKGROUND)
    .resize(size, size)
    .composite([{
      input: await sharp(FOREGROUND).resize(size, size).toBuffer(),
    }])
    .png()
    .toBuffer();
}

async function generate() {
  await sharp(ICON).resize(192, 192).png().toFile(path.join(OUT_DIR, 'icon-192.png'));
  console.log('   ✓ icon-192.png              (192×192)');

  await sharp(ICON).resize(512, 512).png().toFile(path.join(OUT_DIR, 'icon-512.png'));
  console.log('   ✓ icon-512.png              (512×512)');

  // Apple exige une icône sans canal alpha — icon.png a déjà un fond doré opaque.
  await sharp(ICON).resize(180, 180).flatten({ background: { r: 214, g: 158, b: 78 } }).png().toFile(path.join(OUT_DIR, 'apple-touch-icon.png'));
  console.log('   ✓ apple-touch-icon.png      (180×180, sans alpha)');

  await sharp(await maskableBuffer(192)).toFile(path.join(OUT_DIR, 'icon-maskable-192.png'));
  console.log('   ✓ icon-maskable-192.png     (192×192, maskable)');

  await sharp(await maskableBuffer(512)).toFile(path.join(OUT_DIR, 'icon-maskable-512.png'));
  console.log('   ✓ icon-maskable-512.png     (512×512, maskable)');

  console.log('\n✅ Icônes PWA générées dans public/icons/');
}

generate().catch((e) => {
  console.error('\n❌ Erreur lors de la génération :', e.message);
  process.exit(1);
});
