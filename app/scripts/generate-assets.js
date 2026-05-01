/**
 * Generate Capacitor assets (icon.png and splash.png) from SVG sources
 *
 * Usage: node scripts/generate-assets.js
 *
 * Requires: sharp (npm install sharp --save-dev)
 */

import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, mkdirSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Paths
const assetsDir = join(rootDir, 'assets');
const srcAssetsDir = join(rootDir, 'src', 'assets');

// Ensure assets directory exists
if (!existsSync(assetsDir)) {
    mkdirSync(assetsDir, { recursive: true });
}

// Icon SVG (1024x1024)
const iconSvg = readFileSync(join(srcAssetsDir, 'logo-icon.svg'), 'utf-8');

// Splash SVG (2732x2732)
const splashSvg = readFileSync(join(srcAssetsDir, 'splash-icon.svg'), 'utf-8');

async function generateAssets() {
    console.log('🎨 Generating Capacitor assets...\n');

    try {
        // Generate icon (1024x1024)
        console.log('📱 Generating icon.png (1024x1024)...');
        await sharp(Buffer.from(iconSvg))
            .resize(1024, 1024)
            .png()
            .toFile(join(assetsDir, 'icon.png'));
        console.log('   ✅ icon.png created');

        // Generate icon-only (for favicon, without background)
        console.log('📱 Generating icon-only.png (1024x1024)...');
        await sharp(Buffer.from(iconSvg))
            .resize(1024, 1024)
            .png()
            .toFile(join(assetsDir, 'icon-only.png'));
        console.log('   ✅ icon-only.png created');

        // Generate splash (2732x2732)
        console.log('🖼️  Generating splash.png (2732x2732)...');
        await sharp(Buffer.from(splashSvg))
            .resize(2732, 2732)
            .png()
            .toFile(join(assetsDir, 'splash.png'));
        console.log('   ✅ splash.png created');

        // Generate splash-dark (same for now, can be customized)
        console.log('🌙 Generating splash-dark.png (2732x2732)...');
        await sharp(Buffer.from(splashSvg))
            .resize(2732, 2732)
            .png()
            .toFile(join(assetsDir, 'splash-dark.png'));
        console.log('   ✅ splash-dark.png created');

        console.log('\n✨ All assets generated successfully!');
        console.log('\nNext steps:');
        console.log('  1. Run: yarn assets:generate');
        console.log('  2. This will generate all platform-specific icons and splashes');
    } catch (error) {
        console.error('❌ Error generating assets:', error);
        process.exit(1);
    }
}

generateAssets();
