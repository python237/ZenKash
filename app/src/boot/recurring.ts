/**
 * Recurring Transactions Boot File
 * Processes due recurring transaction rules on app startup: generates the
 * corresponding transactions and advances each rule's schedule.
 * @module boot/recurring
 */

import { boot } from 'quasar/wrappers';
import { waitForDatabase } from 'src/services/database';
import { useRecurringTransactionStore } from 'src/stores/recurring-transaction';
import { useTransactionStore } from 'src/stores/transaction';
import { useWalletStore } from 'src/stores/wallet';
import { useCategoryStore } from 'src/stores/category';

export default boot(async () => {
    try {
        await waitForDatabase();

        const recurringStore = useRecurringTransactionStore();
        const transactionStore = useTransactionStore();
        const walletStore = useWalletStore();
        const categoryStore = useCategoryStore();

        await Promise.all([
            recurringStore.loadAll(),
            transactionStore.loadAll(),
            walletStore.loadAll(),
            categoryStore.loadAll(),
        ]);

        await recurringStore.processDue();
    } catch (error) {
        console.error('[Recurring] Failed to process due transactions:', error);
    }
});
