/**
 * Génère toutes les variantes d'icônes LikaPay à partir d'un logo source.
 *
 * Usage :
 *   node scripts/generate-icons.js
 *
 * Prérequis :
 *   - assets/lika-logo-source.png (logo carré haute résolution, idéalement transparent)
 *
 * Génère :
 *   - assets/icon.png                       (1024×1024, fond doré, coins ronds)
 *   - assets/android-icon-foreground.png    (1024×1024, symbole 60% au centre, transparent)
 *   - assets/android-icon-background.png    (1024×1024, fond uni doré)
 *   - assets/android-icon-monochrome.png    (1024×1024, symbole blanc sur transparent)
 *   - assets/favicon.png                    (48×48)
 *   - assets/splash-icon.png                (1024×1024, symbole 50% au centre, transparent)
 */

const sharp = require('sharp');
const path  = require('path');
const fs    = require('fs');

const ROOT   = path.resolve(__dirname, '..');
const ASSETS = path.join(ROOT, 'assets');
const SOURCE = path.join(ASSETS, 'lika-logo-source.png');

const GOLD       = { r: 214, g: 158, b: 78,  alpha: 1 };       // #D69E4E
const GOLD_DARK  = { r: 181, g: 130, b: 45,  alpha: 1 };       // #B5822D

if (!fs.existsSync(SOURCE)) {
  console.error(`❌ Logo source introuvable : ${SOURCE}`);
  console.error('   Place ton logo (PNG carré haute résolution) à cet emplacement.');
  process.exit(1);
}

console.log('🎨 Génération des icônes LikaPay…\n');

async function generate() {
  // 1. icon.png — 1024×1024, fond doré + logo centré à 70%
  await sharp({
    create: {
      width:  1024,
      height: 1024,
      channels: 4,
      background: GOLD,
    },
  })
    .composite([{
      input: await sharp(SOURCE)
        .resize(720, 720, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .toBuffer(),
      gravity: 'center',
    }])
    .png()
    .toFile(path.join(ASSETS, 'icon.png'));
  console.log('   ✓ icon.png                     (1024×1024 — fond doré + logo)');

  // 2. android-icon-foreground.png — symbole centré 60% (zone sûre adaptive)
  await sharp({
    create: { width: 1024, height: 1024, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{
      input: await sharp(SOURCE)
        .resize(600, 600, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .toBuffer(),
      gravity: 'center',
    }])
    .png()
    .toFile(path.join(ASSETS, 'android-icon-foreground.png'));
  console.log('   ✓ android-icon-foreground.png  (1024×1024 — symbole transparent)');

  // 3. android-icon-background.png — fond doré uni
  await sharp({
    create: { width: 1024, height: 1024, channels: 4, background: GOLD },
  })
    .png()
    .toFile(path.join(ASSETS, 'android-icon-background.png'));
  console.log('   ✓ android-icon-background.png  (1024×1024 — doré uni)');

  // 4. android-icon-monochrome.png — symbole en blanc/teinte unique
  await sharp(SOURCE)
    .resize(600, 600, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .threshold(50)             // toute couleur non-transparente → noir/blanc
    .negate({ alpha: false })  // inverse (le symbole devient blanc)
    .extend({
      top:    212, bottom: 212, left: 212, right: 212,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toFile(path.join(ASSETS, 'android-icon-monochrome.png'));
  console.log('   ✓ android-icon-monochrome.png  (1024×1024 — symbole blanc)');

  // 5. favicon.png — 48×48
  await sharp(path.join(ASSETS, 'icon.png'))
    .resize(48, 48, { fit: 'cover' })
    .png()
    .toFile(path.join(ASSETS, 'favicon.png'));
  console.log('   ✓ favicon.png                  (48×48)');

  // 6. splash-icon.png — symbole centré 50%, fond transparent
  await sharp({
    create: { width: 1024, height: 1024, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{
      input: await sharp(SOURCE)
        .resize(500, 500, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .toBuffer(),
      gravity: 'center',
    }])
    .png()
    .toFile(path.join(ASSETS, 'splash-icon.png'));
  console.log('   ✓ splash-icon.png              (1024×1024 — splash)');

  console.log('\n✅ Toutes les icônes ont été générées !');
  console.log('\n💡 Prochaine étape : rebuild EAS pour voir le nouveau logo sur l\'A15');
  console.log('   eas build --profile preview --platform android --clear-cache');
}

generate().catch((e) => {
  console.error('\n❌ Erreur lors de la génération :', e.message);
  process.exit(1);
});
