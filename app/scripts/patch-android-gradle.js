/**
 * Patch Android Gradle files to ensure Java 17 compatibility
 * Run this after capacitor sync if gradle files are regenerated
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const androidDir = join(process.cwd(), 'src-capacitor/android');

// Patch root build.gradle to force Java 17 on all subprojects
function patchRootBuildGradle() {
    const filePath = join(androidDir, 'build.gradle');
    if (!existsSync(filePath)) {
        console.log('⚠️  Root build.gradle not found');
        return;
    }

    let content = readFileSync(filePath, 'utf8');

    // Check if already patched
    if (content.includes('Force Java 17 for all subprojects')) {
        console.log('✅ Root build.gradle already patched');
        return;
    }

    // Find the task clean block and insert before it
    const patchCode = `
// Force Java 17 for all subprojects
subprojects {
    afterEvaluate { project ->
        if (project.hasProperty('android')) {
            android {
                compileOptions {
                    sourceCompatibility JavaVersion.VERSION_17
                    targetCompatibility JavaVersion.VERSION_17
                }
            }
        }
    }
}

`;

    // Insert before 'task clean'
    if (content.includes('task clean')) {
        content = content.replace('task clean', patchCode + 'task clean');
        writeFileSync(filePath, content);
        console.log('✅ Root build.gradle patched');
    } else {
        console.log('⚠️  Could not find insertion point in root build.gradle');
    }
}

// Patch app build.gradle
function patchAppBuildGradle() {
    const filePath = join(androidDir, 'app/build.gradle');
    if (!existsSync(filePath)) {
        console.log('⚠️  App build.gradle not found');
        return;
    }

    let content = readFileSync(filePath, 'utf8');

    // Check if compileOptions already exists
    if (content.includes('compileOptions')) {
        // Replace any existing Java version with 17
        content = content.replace(
            /sourceCompatibility\s+JavaVersion\.VERSION_\d+/g,
            'sourceCompatibility JavaVersion.VERSION_17',
        );
        content = content.replace(
            /targetCompatibility\s+JavaVersion\.VERSION_\d+/g,
            'targetCompatibility JavaVersion.VERSION_17',
        );
        writeFileSync(filePath, content);
        console.log('✅ App build.gradle updated to Java 17');
        return;
    }

    // Add compileOptions if not present
    const patchCode = `
    compileOptions {
        sourceCompatibility JavaVersion.VERSION_17
        targetCompatibility JavaVersion.VERSION_17
    }
`;

    // Insert after buildTypes block
    if (content.includes('buildTypes {')) {
        const buildTypesEnd = content.indexOf('}', content.indexOf('buildTypes {'));
        const afterBuildTypes = content.indexOf('}', buildTypesEnd + 1);
        content =
            content.slice(0, afterBuildTypes + 1) + patchCode + content.slice(afterBuildTypes + 1);
        writeFileSync(filePath, content);
        console.log('✅ App build.gradle patched with compileOptions');
    }
}

// Patch gradle.properties
function patchGradleProperties() {
    const filePath = join(androidDir, 'gradle.properties');
    if (!existsSync(filePath)) {
        console.log('⚠️  gradle.properties not found');
        return;
    }

    let content = readFileSync(filePath, 'utf8');
    const javaHomeLine =
        'org.gradle.java.home=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home';

    if (content.includes('org.gradle.java.home')) {
        // Replace existing java.home
        content = content.replace(/org\.gradle\.java\.home=.*/, javaHomeLine);
        console.log('✅ gradle.properties java.home updated');
    } else {
        // Add java.home
        content += '\n# Use Java 17 from Homebrew (macOS ARM)\n' + javaHomeLine + '\n';
        console.log('✅ gradle.properties java.home added');
    }

    writeFileSync(filePath, content);
}

// Patch gradle wrapper to use 8.5
function patchGradleWrapper() {
    const filePath = join(androidDir, 'gradle/wrapper/gradle-wrapper.properties');
    if (!existsSync(filePath)) {
        console.log('⚠️  gradle-wrapper.properties not found');
        return;
    }

    let content = readFileSync(filePath, 'utf8');

    // Update to Gradle 8.5 if using older version
    if (
        !content.includes('gradle-8.5') &&
        !content.includes('gradle-8.6') &&
        !content.includes('gradle-8.7')
    ) {
        content = content.replace(
            /distributionUrl=.*gradle-[\d.]+-.*.zip/,
            'distributionUrl=https\\://services.gradle.org/distributions/gradle-8.5-all.zip',
        );
        writeFileSync(filePath, content);
        console.log('✅ Gradle wrapper updated to 8.5');
    } else {
        console.log('✅ Gradle wrapper already up to date');
    }
}

// Patch variables.gradle to use SDK 35 (Android 15 for Capacitor 8)
function patchVariablesGradle() {
    const filePath = join(androidDir, 'variables.gradle');
    if (!existsSync(filePath)) {
        console.log('⚠️  variables.gradle not found');
        return;
    }

    let content = readFileSync(filePath, 'utf8');
    let modified = false;

    // Update compileSdkVersion to 35
    if (content.includes('compileSdkVersion = 34') || content.includes('compileSdkVersion = 33')) {
        content = content.replace(/compileSdkVersion = \d+/, 'compileSdkVersion = 35');
        modified = true;
    }

    // Update targetSdkVersion to 35
    if (content.includes('targetSdkVersion = 34') || content.includes('targetSdkVersion = 33')) {
        content = content.replace(/targetSdkVersion = \d+/, 'targetSdkVersion = 35');
        modified = true;
    }

    if (modified) {
        writeFileSync(filePath, content);
        console.log('✅ variables.gradle updated to SDK 35');
    } else {
        console.log('✅ variables.gradle already has SDK 35');
    }
}

console.log('🔧 Patching Android Gradle files for Java 17...\n');

patchRootBuildGradle();
patchAppBuildGradle();
patchGradleProperties();
patchGradleWrapper();
patchVariablesGradle();

console.log('\n✨ Done!');
