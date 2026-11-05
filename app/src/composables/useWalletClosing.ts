/**
 * Wallet Closing Composable
 *
 * Shared by the goal and wallet closing dialogs: a wallet can only be closed
 * at zero, so whatever is left is first moved to another wallet, then the
 * wallet is closed in the same step.
 * @module composables/useWalletClosing
 */

import type { Wallet } from 'src/types/wallet';

/**
 * Provides the closing helpers.
 * @returns Transfer targets, recurring rules affected and the closing action
 */
export function useWalletClosing() {
    const { t } = useI18n();
    const walletStore = useWalletStore();
    const transactionStore = useTransactionStore();
    const recurringStore = useRecurringTransactionStore();

    /**
     * Wallets able to receive the remainder: open, regular, other than the one
     * being closed, and in the same currency (a transfer moves one amount).
     * @param wallet - The wallet being closed
     * @returns The possible targets
     */
    function targetsFor(wallet: Wallet): Wallet[] {
        return walletStore.nonGameWallets.filter(
            (w: Wallet) => w.id !== wallet.id && w.currency === wallet.currency,
        );
    }

    /**
     * Active recurring rules that closing the wallet will switch off.
     * @param wallet - The wallet being closed
     * @returns Names (descriptions) of those rules, empty when none
     */
    function activeRulesFor(wallet: Wallet): string[] {
        return recurringStore
            .rulesForWallet(wallet.id)
            .filter((rule) => rule.isActive)
            .map((rule) => rule.description || t('recurring.title'));
    }

    /**
     * Moves the remainder (when positive) to the target, then closes the wallet.
     * @param wallet - The wallet to close
     * @param targetId - Wallet receiving the remainder, required when the balance is positive
     * @returns Promise resolving when the wallet is closed
     */
    async function transferAndClose(wallet: Wallet, targetId?: string): Promise<void> {
        if (wallet.balance > 0 && targetId) {
            await transactionStore.create({
                type: 'transfer',
                amount: wallet.balance,
                date: new Date(),
                fromWalletId: wallet.id,
                toWalletId: targetId,
                description: t('wallets.closing.transferDescription', { name: wallet.name }),
            });
        }
        await walletStore.close(wallet.id);
    }

    return { targetsFor, activeRulesFor, transferAndClose };
}
