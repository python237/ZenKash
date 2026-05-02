#!/usr/bin/env node

/**
 * Copy Native Plugins Script
 *
 * Copies custom native plugin files from src-capacitor/resources to the
 * generated Android project and updates the AndroidManifest.xml with
 * required permissions and component declarations.
 */

import { existsSync, mkdirSync, copyFileSync, readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { dirname, resolve, join, relative } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = resolve(__dirname, '..');
const SRC_CAPACITOR_DIR = resolve(ROOT_DIR, 'src-capacitor');
const RESOURCES_DIR = resolve(SRC_CAPACITOR_DIR, 'resources');
const ANDROID_DIR = resolve(SRC_CAPACITOR_DIR, 'android');
const ANDROID_MAIN_DIR = resolve(ANDROID_DIR, 'app/src/main');
const ANDROID_JAVA_DIR = resolve(ANDROID_MAIN_DIR, 'java');
const MANIFEST_PATH = resolve(ANDROID_MAIN_DIR, 'AndroidManifest.xml');

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
    console.log(`${colors[color]}[native-plugins]${colors.reset} ${message}`);
}

/**
 * Recursively copies a directory.
 */
function copyDirRecursive(src, dest) {
    if (!existsSync(dest)) {
        mkdirSync(dest, { recursive: true });
    }

    const entries = readdirSync(src);
    for (const entry of entries) {
        const srcPath = join(src, entry);
        const destPath = join(dest, entry);
        const stat = statSync(srcPath);

        if (stat.isDirectory()) {
            copyDirRecursive(srcPath, destPath);
        } else {
            copyFileSync(srcPath, destPath);
            log(`Copied: ${relative(RESOURCES_DIR, srcPath)}`, 'cyan');
        }
    }
}

/**
 * Updates AndroidManifest.xml with required permissions and components.
 */
function updateAndroidManifest() {
    if (!existsSync(MANIFEST_PATH)) {
        log('AndroidManifest.xml not found', 'red');
        return false;
    }

    let manifest = readFileSync(MANIFEST_PATH, 'utf-8');

    // Permissions to add
    const permissionsToAdd = [
        'android.permission.WAKE_LOCK',
        'android.permission.RECEIVE_BOOT_COMPLETED',
        'android.permission.SCHEDULE_EXACT_ALARM',
        'android.permission.USE_EXACT_ALARM',
        'android.permission.USE_FULL_SCREEN_INTENT',
        'android.permission.FOREGROUND_SERVICE',
        'android.permission.POST_NOTIFICATIONS',
        'android.permission.VIBRATE',
    ];

    // Add permissions if not already present
    for (const permission of permissionsToAdd) {
        const permissionTag = `<uses-permission android:name="${permission}"`;
        if (!manifest.includes(permissionTag)) {
            // Find the last uses-permission tag or add after manifest opening
            const insertPoint = manifest.lastIndexOf('</manifest>');
            const permissionLine = `    <uses-permission android:name="${permission}" />\n`;
            
            // Find where to insert (after other permissions or after <manifest> tag)
            const lastPermissionIndex = manifest.lastIndexOf('<uses-permission');
            if (lastPermissionIndex !== -1) {
                const endOfLastPermission = manifest.indexOf('/>', lastPermissionIndex) + 2;
                manifest = manifest.slice(0, endOfLastPermission) + '\n' + permissionLine.trim() + manifest.slice(endOfLastPermission);
            } else {
                // Insert after opening manifest tag
                const manifestTagEnd = manifest.indexOf('>', manifest.indexOf('<manifest')) + 1;
                manifest = manifest.slice(0, manifestTagEnd) + '\n' + permissionLine + manifest.slice(manifestTagEnd);
            }
            log(`Added permission: ${permission}`, 'green');
        }
    }

    // Components to add inside <application>
    const componentsToAdd = `
        <!-- Reminder Plugin Components -->
        <activity
            android:name="com.zenkash.app.reminder.FullScreenAlertActivity"
            android:theme="@android:style/Theme.NoTitleBar.Fullscreen"
            android:showOnLockScreen="true"
            android:turnScreenOn="true"
            android:exported="false">
        </activity>

        <receiver
            android:name="com.zenkash.app.reminder.ReminderReceiver"
            android:exported="false">
        </receiver>

        <receiver
            android:name="com.zenkash.app.reminder.BootReceiver"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.BOOT_COMPLETED" />
            </intent-filter>
        </receiver>
        <!-- End Reminder Plugin Components -->`;

    // Check if components already added
    if (!manifest.includes('com.zenkash.app.reminder.FullScreenAlertActivity')) {
        // Find the closing </application> tag and insert before it
        const appClosingTag = '</application>';
        const appClosingIndex = manifest.lastIndexOf(appClosingTag);
        
        if (appClosingIndex !== -1) {
            manifest = manifest.slice(0, appClosingIndex) + componentsToAdd + '\n        ' + manifest.slice(appClosingIndex);
            log('Added reminder components to AndroidManifest.xml', 'green');
        } else {
            log('Could not find </application> tag in AndroidManifest.xml', 'red');
            return false;
        }
    } else {
        log('Reminder components already present in AndroidManifest.xml', 'yellow');
    }

    writeFileSync(MANIFEST_PATH, manifest);
    return true;
}

/**
 * Updates MainActivity.java to register the ReminderPlugin.
 */
function updateMainActivity() {
    const mainActivityPath = resolve(ANDROID_JAVA_DIR, 'com/zenkash/app/MainActivity.java');
    
    if (!existsSync(mainActivityPath)) {
        log('MainActivity.java not found', 'red');
        return false;
    }

    let mainActivity = readFileSync(mainActivityPath, 'utf-8');

    // Check if import already exists
    const importStatement = 'import com.zenkash.app.reminder.ReminderPlugin;';
    if (!mainActivity.includes(importStatement)) {
        // Add import after the last import statement
        const lastImportIndex = mainActivity.lastIndexOf('import ');
        const endOfLastImport = mainActivity.indexOf(';', lastImportIndex) + 1;
        mainActivity = mainActivity.slice(0, endOfLastImport) + '\n' + importStatement + mainActivity.slice(endOfLastImport);
        log('Added ReminderPlugin import to MainActivity.java', 'green');
    }

    // Check if plugin is already registered
    if (!mainActivity.includes('ReminderPlugin.class')) {
        // Find the registerPlugin calls or onCreate method to add our plugin
        // Look for existing registerPlugin calls
        if (mainActivity.includes('registerPlugin(')) {
            // Add after the last registerPlugin call
            const lastRegisterIndex = mainActivity.lastIndexOf('registerPlugin(');
            const endOfLastRegister = mainActivity.indexOf(';', lastRegisterIndex) + 1;
            mainActivity = mainActivity.slice(0, endOfLastRegister) + '\n        registerPlugin(ReminderPlugin.class);' + mainActivity.slice(endOfLastRegister);
        } else {
            // Need to add onCreate method override
            // Find the class opening brace
            const classStart = mainActivity.indexOf('{', mainActivity.indexOf('class MainActivity'));
            const onCreateMethod = `

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(ReminderPlugin.class);
        super.onCreate(savedInstanceState);
    }
`;
            mainActivity = mainActivity.slice(0, classStart + 1) + onCreateMethod + mainActivity.slice(classStart + 1);
            
            // Also need to add Bundle import if not present
            if (!mainActivity.includes('import android.os.Bundle;')) {
                const firstImportIndex = mainActivity.indexOf('import ');
                mainActivity = mainActivity.slice(0, firstImportIndex) + 'import android.os.Bundle;\n' + mainActivity.slice(firstImportIndex);
            }
        }
        log('Registered ReminderPlugin in MainActivity.java', 'green');
    } else {
        log('ReminderPlugin already registered in MainActivity.java', 'yellow');
    }

    writeFileSync(mainActivityPath, mainActivity);
    return true;
}

/**
 * Main function.
 */
function main() {
    log('Starting native plugins copy...', 'green');

    // Check if Android directory exists
    if (!existsSync(ANDROID_DIR)) {
        log('Android directory not found. Run quasar build first.', 'red');
        process.exit(1);
    }

    // Check if reminder plugin resources exist
    const reminderResourcesDir = resolve(RESOURCES_DIR, 'reminder');
    if (!existsSync(reminderResourcesDir)) {
        log('No native resources to copy.', 'yellow');
        return;
    }

    // Copy reminder Java files to the correct package location
    const reminderDestDir = resolve(ANDROID_JAVA_DIR, 'com/zenkash/app/reminder');
    log('Copying reminder plugin files...', 'blue');
    copyDirRecursive(reminderResourcesDir, reminderDestDir);

    // Update AndroidManifest.xml
    log('Updating AndroidManifest.xml...', 'blue');
    updateAndroidManifest();

    // Update MainActivity.java
    log('Updating MainActivity.java...', 'blue');
    updateMainActivity();

    log('Native plugins copy completed!', 'green');
}

main();
