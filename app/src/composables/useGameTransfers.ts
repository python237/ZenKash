/**
 * Game Transfers Composable
 *
 * Classifies wallet transfers that involve a game platform wallet.
 * Transfers between a game wallet and a regular (non-game) wallet are treated
 * as real cash flows on your guaranteed liquidity:
 * - withdrawal (game → non-game): counts as income
 * - deposit (non-game → game): counts as expense
 *
 * Transfers where both sides are game wallets, or both are non-game wallets,
 * are "internal" and are not counted as income/expense here.
 * @module composables/useGameTransfers
 */

import type { CurrencyCode } from 'src/types/currency';
import { useWalletStore } from 'src/stores/wallet';
import { useGameStore } from 'src/stores/game';

/** Minimal shape of a transfer needed for classification */
interface TransferLike {
    type: string;
    amount: number;
    fromWalletId?: string | undefined;
    toWalletId?: string | undefined;
    fee?: number | undefined;
}

/** Result of classifying a transfer against game wallets */
export interface GameTransferClassification {
    /** deposit = expense (money into a game), withdrawal = income (money out of a game) */
    kind: 'deposit' | 'withdrawal';
    /** Identifier of the involved game */
    gameId: string;
    /** Wallet identifier of the involved game */
    gameWalletId: string;
    /** Amount to count as income/expense (in `currency`) */
    amount: number;
    /** Currency of the non-game wallet side (used for conversion) */
    currency: CurrencyCode;
}

/**
 * Provides helpers to classify transfers relative to game platforms.
 * @returns Helper functions for game transfer classification
 */
export function useGameTransfers() {
    const walletStore = useWalletStore();
    const gameStore = useGameStore();

    /**
     * Whether a wallet id refers to a game-platform wallet.
     * @param id - The wallet identifier
     * @returns True if the wallet is a game wallet
     */
    function isGameWallet(id?: string): boolean {
        if (!id) return false;
        return walletStore.getWalletById(id)?.isGame ?? false;
    }

    /**
     * Classifies a transfer against game wallets.
     * @param tx - The transfer transaction (raw or with relations)
     * @returns The classification, or null if the transfer is not a game deposit/withdrawal
     */
    function classifyTransfer(tx: TransferLike): GameTransferClassification | null {
        if (tx.type !== 'transfer') return null;

        const fromGame = isGameWallet(tx.fromWalletId);
        const toGame = isGameWallet(tx.toWalletId);
        if (fromGame === toGame) return null; // internal transfer, not counted

        const defaultCurrency = walletStore.wallets[0]?.currency ?? ('XOF' as CurrencyCode);

        if (toGame && tx.toWalletId) {
            // deposit: non-game -> game. Expense = amount + fee (what left the non-game wallet)
            const game = gameStore.getGameByWalletId(tx.toWalletId);
            const nonGameCurrency =
                walletStore.getWalletById(tx.fromWalletId ?? '')?.currency ?? defaultCurrency;
            return {
                kind: 'deposit',
                gameId: game?.id ?? '',
                gameWalletId: tx.toWalletId,
                amount: tx.amount + (tx.fee ?? 0),
                currency: nonGameCurrency,
            };
        }

        if (fromGame && tx.fromWalletId) {
            // withdrawal: game -> non-game. Income = amount received by the non-game wallet
            const game = gameStore.getGameByWalletId(tx.fromWalletId);
            const nonGameCurrency =
                walletStore.getWalletById(tx.toWalletId ?? '')?.currency ?? defaultCurrency;
            return {
                kind: 'withdrawal',
                gameId: game?.id ?? '',
                gameWalletId: tx.fromWalletId,
                amount: tx.amount,
                currency: nonGameCurrency,
            };
        }

        return null;
    }

    return { isGameWallet, classifyTransfer };
}
