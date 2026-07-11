import type { CurrencyCode } from './currency';

/**
 * Represents a wallet or account where money is stored.
 * Examples: Cash, Bank Account, Mobile Money (OM), Crypto Wallet.
 * Each wallet has a single currency and tracks its own balance.
 */
export interface Wallet {
    /** Unique identifier for the wallet */
    id: string;
    /** Display name of the wallet */
    name: string;
    /** Icon identifier for visual representation */
    icon: string;
    /** Currency of this wallet (immutable after creation) */
    currency: CurrencyCode;
    /** Current balance, automatically updated with each transaction */
    balance: number;
    /** Whether this wallet belongs to a game platform (excluded from balance reports) */
    isGame: boolean;
    /** Timestamp when the wallet was created */
    createdAt: Date;
    /** Timestamp when the wallet was last updated */
    updatedAt: Date;
}

/**
 * Data required to create a new wallet.
 * Currency must be specified at creation and cannot be changed later.
 */
export interface CreateWallet {
    /** Display name of the wallet */
    name: string;
    /** Icon identifier for visual representation */
    icon: string;
    /** Currency for this wallet */
    currency: CurrencyCode;
    /** Initial balance (defaults to 0 if not specified) */
    balance?: number;
    /** Whether this wallet belongs to a game platform (defaults to false) */
    isGame?: boolean;
}

/**
 * Data for updating an existing wallet.
 * Currency is excluded as it is immutable after creation.
 */
export type UpdateWallet = Partial<Omit<CreateWallet, 'currency'>>;
