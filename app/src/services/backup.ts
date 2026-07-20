/**
 * Backup Service
 *
 * Full offline export/import of the SQLite database as an encrypted JSON file.
 * Export is delivered via a browser download on web, or written to a file and
 * shared via the native share sheet on device. Import reads a picked file,
 * decrypts it and restores every table.
 * @module services/backup
 */

import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { execute, query } from './database';
import { encryptJson, decryptJson } from './crypto';

/** Current backup payload version. */
const BACKUP_VERSION = 1;

/**
 * Tables included in a backup, ordered parents → children so inserts satisfy
 * any foreign-key constraints. Deletes run in reverse order.
 */
const TABLES = [
    'master_categories',
    'categories',
    'wallets',
    'app_settings',
    'exchange_rates',
    'transactions',
    'budgets',
    'investment_items',
    'rate_history',
    'investment_transactions',
    'projects',
    'games',
    'bets',
    'net_worth_snapshots',
    'recurring_transactions',
    'savings_goals',
] as const;

/**
 * The structure of a decrypted backup payload.
 */
export interface BackupPayload {
    /** Application marker */
    app: 'zenkash';
    /** Payload type marker */
    type: 'backup';
    /** Payload version */
    version: number;
    /** ISO timestamp of the export */
    exportedAt: string;
    /** Rows keyed by table name */
    tables: Record<string, Record<string, unknown>[]>;
}

/**
 * Builds a backup payload by dumping every table.
 * App-lock settings are excluded so a restored device keeps its own lock.
 * @returns Promise resolving to the backup payload
 */
async function buildPayload(): Promise<BackupPayload> {
    const tables: Record<string, Record<string, unknown>[]> = {};

    for (const table of TABLES) {
        let rows = await query<Record<string, unknown>>(`SELECT * FROM ${table}`);
        if (table === 'app_settings') {
            rows = rows.filter((row) => !String(row.key).startsWith('app_lock'));
        }
        tables[table] = rows;
    }

    return {
        app: 'zenkash',
        type: 'backup',
        version: BACKUP_VERSION,
        exportedAt: new Date().toISOString(),
        tables,
    };
}

/**
 * Restores a backup payload, replacing all data.
 * The current device's app-lock settings are preserved.
 * @param payload - The decrypted backup payload
 * @returns Promise that resolves when the restore completes
 * @throws Error if the payload is not a valid Zenkash backup
 */
async function restorePayload(payload: BackupPayload): Promise<void> {
    if (payload?.app !== 'zenkash' || payload?.type !== 'backup') {
        throw new Error('INVALID_FILE');
    }

    // Clear existing data (children → parents), preserving the local app-lock
    for (const table of [...TABLES].reverse()) {
        if (table === 'app_settings') {
            await execute(`DELETE FROM app_settings WHERE key NOT LIKE 'app_lock%'`);
        } else {
            await execute(`DELETE FROM ${table}`);
        }
    }

    // Insert restored data (parents → children)
    for (const table of TABLES) {
        const rows = payload.tables[table] ?? [];
        for (const row of rows) {
            if (table === 'app_settings' && String(row.key).startsWith('app_lock')) continue;
            const cols = Object.keys(row);
            if (cols.length === 0) continue;
            const placeholders = cols.map(() => '?').join(', ');
            await execute(
                `INSERT OR REPLACE INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`,
                cols.map((c) => row[c]),
            );
        }
    }
}

/**
 * Delivers exported content: native writes a file and opens the share sheet,
 * web triggers a download.
 * @param content - The file content
 * @param filename - The suggested filename
 * @returns Promise that resolves when delivery completes
 */
async function deliverFile(content: string, filename: string): Promise<void> {
    if (Capacitor.isNativePlatform()) {
        await Filesystem.writeFile({
            path: filename,
            data: content,
            directory: Directory.Cache,
            encoding: Encoding.UTF8,
        });
        const { uri } = await Filesystem.getUri({ path: filename, directory: Directory.Cache });
        await Share.share({ title: filename, url: uri });
        return;
    }

    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
}

/**
 * Exports the whole database as a password-encrypted JSON file.
 * @param password - The password used to encrypt the backup
 * @returns Promise that resolves when the export is delivered
 */
export async function exportBackup(password: string): Promise<void> {
    const payload = await buildPayload();
    const encrypted = await encryptJson(payload, password);
    const stamp = new Date().toISOString().slice(0, 10);
    await deliverFile(encrypted, `zenkash-backup-${stamp}.json`);
}

/**
 * Prompts the user to pick a JSON file and returns its text content.
 * Uses a hidden file input, which opens the native chooser inside the WebView.
 * @returns Promise resolving to the file content, or null if cancelled
 */
export function pickBackupFile(): Promise<string | null> {
    return new Promise((resolve, reject) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json,.json';
        input.onchange = () => {
            const file = input.files?.[0];
            if (!file) {
                resolve(null);
                return;
            }
            const reader = new FileReader();
            reader.onload = () =>
                resolve(typeof reader.result === 'string' ? reader.result : '');
            reader.onerror = () => reject(new Error('READ_ERROR'));
            reader.readAsText(file);
        };
        input.click();
    });
}

/**
 * Imports and restores an encrypted backup from its file content.
 * @param content - The encrypted backup file content
 * @param password - The password used to decrypt the backup
 * @returns Promise that resolves when the restore completes
 * @throws Error 'INVALID_FILE' or 'WRONG_PASSWORD' on failure
 */
export async function importBackup(content: string, password: string): Promise<void> {
    const payload = (await decryptJson(content, password)) as BackupPayload;
    await restorePayload(payload);
}
