import { boot } from 'quasar/wrappers';
import { initDatabase, isNative, setDatabaseReady } from 'src/services/database';
import { defineCustomElements as jeepSqlite } from 'jeep-sqlite/loader';

export default boot(async () => {
    console.log('[Database] Starting initialization...', { isNative: isNative() });

    // Register jeep-sqlite custom element for web support
    if (!isNative()) {
        console.log('[Database] Registering jeep-sqlite for web...');
        jeepSqlite(window);
        const jeepEl = document.createElement('jeep-sqlite');
        jeepEl.setAttribute('wasmPath', '/assets');
        jeepEl.setAttribute('autoSave', 'true');
        document.body.appendChild(jeepEl);
        await customElements.whenDefined('jeep-sqlite');
        console.log('[Database] jeep-sqlite registered');
    }

    // Initialize database
    try {
        await initDatabase();
        console.log('[Database] Initialized successfully');
    } catch (error) {
        console.error('[Database] Failed to initialize:', error);
        // Still mark as ready so the app can continue (will show error state)
        setDatabaseReady();
    }
});
