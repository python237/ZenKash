#!/usr/bin/env node

/**
 * Android Build Script
 *
 * This script handles the complete Android build process:
 * 0. (Optional) Increment app version
 * 1. Generate icons and splash screens from SVG sources
 * 2. Copy assets to src-capacitor for capacitor-assets
 * 3. Generate platform-specific icons using capacitor-assets
 * 4. Build the Quasar app for Capacitor Android
 * 5. Patch Gradle files for Java 17 compatibility
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync, copyFileSync, rmSync, readFileSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { createInterface } from 'readline';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = resolve(__dirname, '..');
const ASSETS_DIR = resolve(ROOT_DIR, 'assets');
const SRC_CAPACITOR_DIR = resolve(ROOT_DIR, 'src-capacitor');
const SRC_CAPACITOR_ASSETS_DIR = resolve(SRC_CAPACITOR_DIR, 'assets');
const PACKAGE_JSON_PATH = resolve(ROOT_DIR, 'package.json');

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    red: '\x1b[31m',
    cyan: '\x1b[36m',
};

function log(message, color = 'blue') {
    console.log(`${colors[color]}[android]${colors.reset} ${message}`);
}

function logStep(step, message) {
    console.log(`\n${colors.green}=== Step ${step}: ${message} ===${colors.reset}\n`);
}

function runCommand(command, options = {}) {
    log(`Running: ${command}`, 'yellow');
    try {
        execSync(command, {
            cwd: ROOT_DIR,
            stdio: 'inherit',
            ...options,
        });
    } catch (error) {
        log(`Command failed: ${command}`, 'red');
        process.exit(1);
    }
}

// Read package.json
function getPackageJson() {
    const content = readFileSync(PACKAGE_JSON_PATH, 'utf-8');
    return JSON.parse(content);
}

// Write package.json
function savePackageJson(pkg) {
    writeFileSync(PACKAGE_JSON_PATH, JSON.stringify(pkg, null, 2) + '\n');
}

// Increment version
function incrementVersion(version, type) {
    const parts = version.split('.').map(Number);
    switch (type) {
        case 'major':
            return `${parts[0] + 1}.0.0`;
        case 'minor':
            return `${parts[0]}.${parts[1] + 1}.0`;
        case 'patch':
            return `${parts[0]}.${parts[1]}.${parts[2] + 1}`;
        default:
            return version;
    }
}

// Prompt user for version increment
function promptVersion(currentVersion) {
    return new Promise((resolve) => {
        const rl = createInterface({
            input: process.stdin,
            output: process.stdout,
        });

        console.log(
            `\n${colors.cyan}Current version: ${colors.yellow}${currentVersion}${colors.reset}`,
        );
        console.log(`${colors.cyan}Do you want to increment the version?${colors.reset}`);
        console.log(
            `  ${colors.green}1${colors.reset}) Patch (${incrementVersion(currentVersion, 'patch')})`,
        );
        console.log(
            `  ${colors.green}2${colors.reset}) Minor (${incrementVersion(currentVersion, 'minor')})`,
        );
        console.log(
            `  ${colors.green}3${colors.reset}) Major (${incrementVersion(currentVersion, 'major')})`,
        );
        console.log(`  ${colors.green}s${colors.reset}) Skip (keep ${currentVersion})`);
        console.log('');

        rl.question(`${colors.cyan}Your choice [1/2/3/s]: ${colors.reset}`, (answer) => {
            rl.close();
            const choice = answer.trim().toLowerCase();
            switch (choice) {
                case '1':
                    resolve('patch');
                    break;
                case '2':
                    resolve('minor');
                    break;
                case '3':
                    resolve('major');
                    break;
                default:
                    resolve(null);
            }
        });
    });
}

async function main() {
    log('Starting Android build process...', 'green');

    // Step 0: Version increment prompt
    const pkg = getPackageJson();
    const currentVersion = pkg.version;
    const versionChoice = await promptVersion(currentVersion);

    if (versionChoice) {
        const newVersion = incrementVersion(currentVersion, versionChoice);
        pkg.version = newVersion;
        savePackageJson(pkg);
        log(`Version updated: ${currentVersion} → ${newVersion}`, 'green');
    } else {
        log(`Keeping version: ${currentVersion}`, 'yellow');
    }

    // Step 1: Generate icons from SVG
    logStep(1, 'Generate icons from SVG sources');
    runCommand('node scripts/generate-assets.js');

    // Verify assets were generated
    const requiredAssets = ['icon.png', 'icon-only.png', 'splash.png', 'splash-dark.png'];
    for (const asset of requiredAssets) {
        const assetPath = resolve(ASSETS_DIR, asset);
        if (!existsSync(assetPath)) {
            log(`Missing required asset: ${asset}`, 'red');
            process.exit(1);
        }
    }
    log('All assets generated successfully');

    // Step 2: Copy assets to src-capacitor
    logStep(2, 'Copy assets to src-capacitor');
    if (!existsSync(SRC_CAPACITOR_ASSETS_DIR)) {
        mkdirSync(SRC_CAPACITOR_ASSETS_DIR, { recursive: true });
    }
    for (const asset of requiredAssets) {
        const src = resolve(ASSETS_DIR, asset);
        const dest = resolve(SRC_CAPACITOR_ASSETS_DIR, asset);
        copyFileSync(src, dest);
        log(`Copied ${asset}`);
    }

    // Step 3: Generate platform-specific icons
    logStep(3, 'Generate platform-specific icons');
    runCommand('npx capacitor-assets generate --android', { cwd: SRC_CAPACITOR_DIR });

    // Step 4: Build Quasar app for Capacitor Android
    logStep(4, 'Build Quasar app for Capacitor Android');
    runCommand('quasar build -m capacitor -T android');

    // Step 5: Copy native plugins
    logStep(5, 'Copy native plugins to Android project');
    runCommand('node scripts/copy-native-plugins.js');

    // Step 6: Patch Gradle files for Java 17
    logStep(6, 'Patch Gradle files for Java 17 compatibility');
    runCommand('node scripts/patch-android-gradle.js');

    // Cleanup: Remove temporary assets folder in src-capacitor
    if (existsSync(SRC_CAPACITOR_ASSETS_DIR)) {
        rmSync(SRC_CAPACITOR_ASSETS_DIR, { recursive: true });
        log('Cleaned up temporary assets folder');
    }

    // Get final version
    const finalPkg = getPackageJson();

    console.log(`
${colors.green}========================================${colors.reset}
${colors.green}  Android build completed successfully!  ${colors.reset}
${colors.green}========================================${colors.reset}

  ${colors.cyan}App:${colors.reset} ${finalPkg.productName || finalPkg.name}
  ${colors.cyan}Version:${colors.reset} ${finalPkg.version}

Next steps:
  1. Open Android Studio: ${SRC_CAPACITOR_DIR}/android
  2. Build > Generate Signed Bundle / APK
  3. Or run: cd src-capacitor/android && ./gradlew assembleDebug
`);
}

main().catch((error) => {
    log(`Build failed: ${error.message}`, 'red');
    process.exit(1);
});
