/**
 * Currency Composable
 *
 * Single place where amounts are formatted and converted into the user's default
 * currency. Every screen showing money must use it: the conversion rule (per
 * wallet currency, through the exchange-rate store) is what keeps the dashboard,
 * the reports and the analytics screens in agreement.
 * @module composables/useCurrency
 */

import { CURRENCIES, CurrencyCode } from 'src/types/currency';
import { useSettingsStore } from 'src/stores/settings';
import { useExchangeRateStore } from 'src/stores/exchange-rate';
import { useWalletStore } from 'src/stores/wallet';

/** Options accepted by the percentage formatter. */
interface PercentOptions {
    /** Prefix positive values with a `+` */
    signed?: boolean;
    /** Number of decimals (default 1) */
    decimals?: number;
}

/**
 * Provides reactive currency formatting and conversion helpers.
 * @returns Formatters, converters and the resolved default currency
 */
export function useCurrency() {
    const { locale } = useI18n();
    const settingsStore = useSettingsStore();
    const exchangeRateStore = useExchangeRateStore();
    const walletStore = useWalletStore();

    /** The currency every displayed amount is converted to. */
    const defaultCurrency = computed(() => settingsStore.defaultCurrency ?? CurrencyCode.XOF);

    /** Metadata (symbol, decimals) of the default currency. */
    const currencyInfo = computed(() => CURRENCIES[defaultCurrency.value]);

    /**
     * Formats an amount as a localized currency string.
     *
     * The optional `currency` is for the few screens that display amounts in the
     * currency they were recorded in (savings goals, wallet details) instead of
     * converting them: pass it rather than building a local `Intl` formatter.
     * @param amount - Amount in `currency`, or in the default currency
     * @param currency - Currency to render in, defaults to the user's currency
     * @returns The formatted string, for example `12 500 FCFA`
     */
    function formatCurrency(amount: number, currency?: CurrencyCode): string {
        const code = currency ?? defaultCurrency.value;
        const decimals = CURRENCIES[code]?.decimals ?? 0;
        return new Intl.NumberFormat(locale.value, {
            style: 'currency',
            currency: code,
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
        }).format(amount);
    }

    /**
     * Formats an amount with an explicit `+` on positive values.
     * @param amount - Amount in the default currency
     * @returns The signed currency string
     */
    function formatSignedCurrency(amount: number): string {
        return `${amount > 0 ? '+' : ''}${formatCurrency(amount)}`;
    }

    /**
     * Formats an amount in compact notation, for chart axes and tight labels.
     * @param amount - Amount in the default currency
     * @returns The compact string, for example `12,5 k FCFA`
     */
    function formatCompactCurrency(amount: number): string {
        return new Intl.NumberFormat(locale.value, {
            style: 'currency',
            currency: defaultCurrency.value,
            notation: 'compact',
            maximumFractionDigits: 1,
        }).format(amount);
    }

    /**
     * Formats a percentage value.
     * @param value - Percentage value (45.5 renders as `45,5 %`)
     * @param options - Sign and precision options
     * @returns The formatted percentage string
     */
    function formatPercent(value: number, options: PercentOptions = {}): string {
        const { signed = false, decimals = 1 } = options;
        const sign = signed && value > 0 ? '+' : '';
        return `${sign}${value.toFixed(decimals)}%`;
    }

    /**
     * Converts an amount into the default currency.
     * @param amount - Amount expressed in `from`
     * @param from - Source currency
     * @returns The converted amount
     */
    function convert(amount: number, from: CurrencyCode): number {
        return exchangeRateStore.convertWithDefault(amount, from, defaultCurrency.value);
    }

    /**
     * Resolves the currency of a wallet, falling back to the default currency
     * when the wallet is unknown (deleted wallet, or a flow without a wallet).
     * @param walletId - Wallet identifier
     * @returns The wallet currency
     */
    function walletCurrency(walletId?: string): CurrencyCode {
        if (!walletId) return defaultCurrency.value;
        return walletStore.getWalletById(walletId)?.currency ?? defaultCurrency.value;
    }

    /**
     * Converts an amount recorded in a wallet into the default currency.
     * @param amount - Amount as recorded on the transaction
     * @param walletId - Wallet the transaction is attached to
     * @returns The converted amount
     */
    function convertFromWallet(amount: number, walletId?: string): number {
        return convert(amount, walletCurrency(walletId));
    }

    return {
        defaultCurrency,
        currencyInfo,
        formatCurrency,
        formatSignedCurrency,
        formatCompactCurrency,
        formatPercent,
        convert,
        walletCurrency,
        convertFromWallet,
    };
}
