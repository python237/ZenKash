/**
 * Net Worth Boot File
 * Captures a net worth snapshot for the current month on app startup so the
 * timeline stays up to date. Runs after the recurring boot so generated
 * transactions are reflected in the snapshot.
 * @module boot/net-worth
 */

import { boot } from 'quasar/wrappers';
import { waitForDatabase } from 'src/services/database';
import { useNetWorthStore } from 'src/stores/net-worth';
import { useWalletStore } from 'src/stores/wallet';
import { useInvestmentStore } from 'src/stores/investment';
import { useExchangeRateStore } from 'src/stores/exchange-rate';
import { useSettingsStore } from 'src/stores/settings';

export default boot(async () => {
    try {
        await waitForDatabase();

        const netWorthStore = useNetWorthStore();
        const walletStore = useWalletStore();
        const investmentStore = useInvestmentStore();
        const exchangeRateStore = useExchangeRateStore();
        const settingsStore = useSettingsStore();

        await Promise.all([
            netWorthStore.loadAll(),
            walletStore.loadAll(),
            investmentStore.loadAll(),
            exchangeRateStore.loadAll(),
            settingsStore.loadSettings(),
        ]);

        await netWorthStore.captureCurrent();
    } catch (error) {
        console.error('[NetWorth] Failed to capture snapshot:', error);
    }
});
