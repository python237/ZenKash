/**
 * Database Service
 *
 * Provides SQLite database functionality for the Zenkash application.
 * Handles database initialization, schema creation, migrations, and CRUD operations.
 * Uses @capacitor-community/sqlite for native SQLite support and jeep-sqlite for web.
 * @module services/database
 */

import { CapacitorSQLite, SQLiteConnection } from '@capacitor-community/sqlite';
import type { SQLiteDBConnection } from '@capacitor-community/sqlite';
import { Capacitor } from '@capacitor/core';

// Database name
const DB_NAME = 'zenkash';

// SQLite connection singleton
let sqlite: SQLiteConnection | null = null;
let db: SQLiteDBConnection | null = null;

// Promise to track database readiness
let dbReadyResolve: (() => void) | null = null;
const dbReadyPromise = new Promise<void>((resolve) => {
    dbReadyResolve = resolve;
});

/**
 * Checks if the application is running on a native platform (iOS/Android).
 * @returns True if running on native platform, false if running on web
 */
export function isNative(): boolean {
    return Capacitor.isNativePlatform();
}

/**
 * Waits for the database to be fully initialized and ready for operations.
 * This should be called before performing any database operations to ensure
 * the database connection is established.
 * @returns A promise that resolves when the database is ready
 */
export async function waitForDatabase(): Promise<void> {
    await dbReadyPromise;
}

/**
 * Manually marks the database as ready.
 * Used when database initialization fails but the application should continue running.
 * This allows the app to proceed in a degraded state without database functionality.
 */
export function setDatabaseReady(): void {
    if (dbReadyResolve) {
        dbReadyResolve();
        dbReadyResolve = null;
    }
}

/**
 * Initializes the SQLite database connection.
 * Creates the database if it doesn't exist, sets up the schema, and runs migrations.
 * For web platforms, initializes jeep-sqlite web store.
 * @returns A promise that resolves when the database is fully initialized
 * @throws Error if database connection fails
 */
export async function initDatabase(): Promise<void> {
    if (db) {
        // Already initialized, resolve immediately if not already done
        if (dbReadyResolve) {
            dbReadyResolve();
            dbReadyResolve = null;
        }
        return;
    }

    sqlite = new SQLiteConnection(CapacitorSQLite);

    // For web, we need to use jeep-sqlite
    if (!isNative()) {
        await customElements.whenDefined('jeep-sqlite');
        await sqlite.initWebStore();
    }

    // Create and open database
    const ret = await sqlite.checkConnectionsConsistency();
    const isConn = (await sqlite.isConnection(DB_NAME, false)).result;

    if (ret.result && isConn) {
        db = await sqlite.retrieveConnection(DB_NAME, false);
    } else {
        db = await sqlite.createConnection(DB_NAME, false, 'no-encryption', 1, false);
    }

    await db.open();

    // Create tables
    await createTables();

    // Signal that database is ready
    if (dbReadyResolve) {
        dbReadyResolve();
        dbReadyResolve = null;
    }
}

/**
 * Creates all database tables if they don't exist.
 * Defines the schema for master_categories, categories, wallets, transactions,
 * budgets, investment_items, rate_history, investment_transactions, and projects.
 * @throws Error if database is not initialized
 */
async function createTables(): Promise<void> {
    if (!db) throw new Error('Database not initialized');

    const schema = `
    CREATE TABLE IF NOT EXISTS master_categories (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
      icon TEXT NOT NULL,
      color TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      master_category_id TEXT NOT NULL,
      icon TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (master_category_id) REFERENCES master_categories(id)
    );

    CREATE TABLE IF NOT EXISTS wallets (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      icon TEXT,
      currency TEXT NOT NULL,
      balance REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS exchange_rates (
      id TEXT PRIMARY KEY NOT NULL,
      from_currency TEXT NOT NULL,
      to_currency TEXT NOT NULL,
      rate REAL NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('income', 'expense', 'transfer', 'project')),
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      category_id TEXT,
      wallet_id TEXT,
      from_wallet_id TEXT,
      to_wallet_id TEXT,
      fee REAL,
      project_id TEXT,
      project_transaction_type TEXT CHECK(project_transaction_type IS NULL OR project_transaction_type IN ('injection', 'dividend')),
      description TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (category_id) REFERENCES categories(id),
      FOREIGN KEY (wallet_id) REFERENCES wallets(id)
    );

    CREATE TABLE IF NOT EXISTS budgets (
      id TEXT PRIMARY KEY NOT NULL,
      month TEXT NOT NULL,
      category_id TEXT,
      master_category_id TEXT,
      amount REAL NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS investment_items (
      id TEXT PRIMARY KEY NOT NULL,
      label TEXT NOT NULL,
      type TEXT NOT NULL,
      quantity REAL NOT NULL,
      current_rate REAL NOT NULL,
      currency TEXT NOT NULL,
      wallet_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (wallet_id) REFERENCES wallets(id)
    );

    CREATE TABLE IF NOT EXISTS rate_history (
      id TEXT PRIMARY KEY NOT NULL,
      investment_item_id TEXT NOT NULL,
      rate REAL NOT NULL,
      date TEXT NOT NULL,
      FOREIGN KEY (investment_item_id) REFERENCES investment_items(id)
    );

    CREATE TABLE IF NOT EXISTS investment_transactions (
      id TEXT PRIMARY KEY NOT NULL,
      investment_item_id TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('buy', 'sell')),
      quantity REAL NOT NULL,
      price_per_unit REAL NOT NULL,
      date TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (investment_item_id) REFERENCES investment_items(id)
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      total_invested REAL NOT NULL DEFAULT 0,
      total_dividends REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `;

    await db.execute(schema);

    // Run migrations for existing databases
    await runMigrations();
}

/**
 * Runs database migrations to update the schema for existing databases.
 * Handles adding new columns and restructuring tables as needed.
 * Migrations include:
 * - Adding currency column to wallets and investment_items
 * - Adding balance column to wallets
 * - Adding transfer-related columns to transactions (from_wallet_id, to_wallet_id, fee)
 * - Adding project-related columns to transactions
 * - Adding total_dividends to projects
 * - Removing NOT NULL constraint from category_id in transactions
 * - Removing wallet_id from projects
 */
async function runMigrations(): Promise<void> {
    if (!db) return;

    // Migration: Add currency column to wallets if not exists
    try {
        const walletsInfo = await db.query('PRAGMA table_info(wallets)');
        const walletsColumns = walletsInfo.values || [];
        const walletHasCurrency = walletsColumns.some(
            (col: { name: string }) => col.name === 'currency',
        );

        if (!walletHasCurrency) {
            await db.execute(`ALTER TABLE wallets ADD COLUMN currency TEXT NOT NULL DEFAULT 'XOF'`);
            console.log('Migration: Added currency column to wallets table');
        }

        // Add balance column if not exists
        const walletHasBalance = walletsColumns.some(
            (col: { name: string }) => col.name === 'balance',
        );
        if (!walletHasBalance) {
            await db.execute(`ALTER TABLE wallets ADD COLUMN balance REAL NOT NULL DEFAULT 0`);
            console.log('Migration: Added balance column to wallets table');
        }
    } catch (error) {
        console.error('Wallets migration error:', error);
    }

    // Migration: Add currency column to investment_items if not exists
    try {
        const investmentInfo = await db.query('PRAGMA table_info(investment_items)');
        const investmentColumns = investmentInfo.values || [];
        const investmentHasCurrency = investmentColumns.some(
            (col: { name: string }) => col.name === 'currency',
        );

        if (!investmentHasCurrency) {
            await db.execute(
                `ALTER TABLE investment_items ADD COLUMN currency TEXT NOT NULL DEFAULT 'XOF'`,
            );
            console.log('Migration: Added currency column to investment_items table');
        }
    } catch (error) {
        console.error('Investment items migration error:', error);
    }

    // Migration: Add new columns to transactions table
    try {
        const transactionsInfo = await db.query('PRAGMA table_info(transactions)');
        const transactionsColumns = transactionsInfo.values || [];
        const columnNames = transactionsColumns.map((col: { name: string }) => col.name);

        if (!columnNames.includes('from_wallet_id')) {
            await db.execute(`ALTER TABLE transactions ADD COLUMN from_wallet_id TEXT`);
            console.log('Migration: Added from_wallet_id column to transactions table');
        }

        if (!columnNames.includes('to_wallet_id')) {
            await db.execute(`ALTER TABLE transactions ADD COLUMN to_wallet_id TEXT`);
            console.log('Migration: Added to_wallet_id column to transactions table');
        }

        if (!columnNames.includes('fee')) {
            await db.execute(`ALTER TABLE transactions ADD COLUMN fee REAL`);
            console.log('Migration: Added fee column to transactions table');
        }

        if (!columnNames.includes('project_id')) {
            await db.execute(`ALTER TABLE transactions ADD COLUMN project_id TEXT`);
            console.log('Migration: Added project_id column to transactions table');
        }

        if (!columnNames.includes('project_transaction_type')) {
            await db.execute(`ALTER TABLE transactions ADD COLUMN project_transaction_type TEXT`);
            console.log('Migration: Added project_transaction_type column to transactions table');
        }
    } catch (error) {
        console.error('Transactions migration error:', error);
    }

    // Migration: Add total_dividends column to projects table
    try {
        const projectsInfo = await db.query('PRAGMA table_info(projects)');
        const projectsColumns = projectsInfo.values || [];
        const hasTotalDividends = projectsColumns.some(
            (col: { name: string }) => col.name === 'total_dividends',
        );

        if (!hasTotalDividends) {
            await db.execute(
                `ALTER TABLE projects ADD COLUMN total_dividends REAL NOT NULL DEFAULT 0`,
            );
            console.log('Migration: Added total_dividends column to projects table');
        }
    } catch (error) {
        console.error('Projects migration error:', error);
    }

    // Migration: Remove NOT NULL constraint from category_id in transactions table
    // SQLite doesn't support ALTER COLUMN, so we recreate the table
    try {
        const transactionsInfo = await db.query('PRAGMA table_info(transactions)');
        const categoryColumn = (transactionsInfo.values || []).find(
            (col: { name: string; notnull: number }) => col.name === 'category_id',
        ) as { name: string; notnull: number } | undefined;

        // If category_id has NOT NULL constraint (notnull = 1), recreate table
        if (categoryColumn && categoryColumn.notnull === 1) {
            console.log(
                'Migration: Recreating transactions table to remove NOT NULL from category_id',
            );

            await db.execute(`
        CREATE TABLE IF NOT EXISTS transactions_new (
          id TEXT PRIMARY KEY NOT NULL,
          type TEXT NOT NULL CHECK(type IN ('income', 'expense', 'transfer', 'project')),
          amount REAL NOT NULL,
          date TEXT NOT NULL,
          category_id TEXT,
          wallet_id TEXT,
          from_wallet_id TEXT,
          to_wallet_id TEXT,
          fee REAL,
          project_id TEXT,
          project_transaction_type TEXT CHECK(project_transaction_type IS NULL OR project_transaction_type IN ('injection', 'dividend')),
          description TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (category_id) REFERENCES categories(id),
          FOREIGN KEY (wallet_id) REFERENCES wallets(id)
        )
      `);

            await db.execute(`
        INSERT INTO transactions_new 
        SELECT id, type, amount, date, category_id, wallet_id, from_wallet_id, to_wallet_id, fee, project_id, project_transaction_type, description, created_at, updated_at 
        FROM transactions
      `);

            await db.execute(`DROP TABLE transactions`);
            await db.execute(`ALTER TABLE transactions_new RENAME TO transactions`);

            console.log('Migration: Successfully recreated transactions table');
        }
    } catch (error) {
        console.error('Transactions NOT NULL migration error:', error);
    }

    // Migration: Remove wallet_id from projects table (projects are no longer linked to a wallet)
    try {
        const projectsInfo = await db.query('PRAGMA table_info(projects)');
        const projectsColumns = projectsInfo.values || [];
        const hasWalletId = projectsColumns.some(
            (col: { name: string }) => col.name === 'wallet_id',
        );

        if (hasWalletId) {
            console.log('Migration: Recreating projects table to remove wallet_id');

            await db.execute(`
        CREATE TABLE IF NOT EXISTS projects_new (
          id TEXT PRIMARY KEY NOT NULL,
          name TEXT NOT NULL,
          description TEXT,
          total_invested REAL NOT NULL DEFAULT 0,
          total_dividends REAL NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `);

            await db.execute(`
        INSERT INTO projects_new (id, name, description, total_invested, total_dividends, created_at, updated_at)
        SELECT id, name, description, total_invested, total_dividends, created_at, updated_at
        FROM projects
      `);

            await db.execute(`DROP TABLE projects`);
            await db.execute(`ALTER TABLE projects_new RENAME TO projects`);

            console.log('Migration: Successfully recreated projects table');
        }
    } catch (error) {
        console.error('Projects wallet_id migration error:', error);
    }
}

/**
 * Gets the active database connection instance.
 * @returns The SQLite database connection
 * @throws Error if database has not been initialized
 */
export function getDatabase(): SQLiteDBConnection {
    if (!db) throw new Error('Database not initialized');
    return db;
}

/**
 * Executes a SQL statement without returning results.
 * Use for INSERT, UPDATE, DELETE, and other non-query operations.
 * @param sql - The SQL statement to execute
 * @param values - Optional array of parameter values for prepared statements
 * @returns A promise that resolves when the statement is executed
 * @throws Error if database is not initialized
 */
export async function execute(sql: string, values?: unknown[]): Promise<void> {
    const database = getDatabase();
    await database.run(sql, values);
}

/**
 * Executes a SQL query and returns the results.
 * Use for SELECT statements that return data.
 * @template T - The expected type of the returned rows
 * @param sql - The SQL query to execute
 * @param values - Optional array of parameter values for prepared statements
 * @returns A promise that resolves to an array of rows
 * @throws Error if database is not initialized
 */
export async function query<T>(sql: string, values?: unknown[]): Promise<T[]> {
    const database = getDatabase();
    const result = await database.query(sql, values);
    return (result.values ?? []) as T[];
}

/**
 * Closes the database connection.
 * Should be called when the application is shutting down or when
 * the database connection is no longer needed.
 * @returns A promise that resolves when the connection is closed
 */
export async function closeDatabase(): Promise<void> {
    if (db) {
        await db.close();
        db = null;
    }
}
