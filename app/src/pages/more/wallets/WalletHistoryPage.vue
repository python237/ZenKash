<template>
    <q-page class="q-pa-md">
        <template v-if="wallet">
            <!-- Current balance -->
            <q-card flat bordered class="history-header q-mb-md">
                <q-card-section class="row items-center no-wrap q-gutter-md">
                    <q-avatar class="bg-primary-1" size="44px">
                        <q-icon :name="wallet.icon" color="primary" size="22px" />
                    </q-avatar>
                    <div class="col">
                        <div class="text-caption text-grey-7">
                            {{ wallet.name }} · {{ t('wallets.history.currentBalance') }}
                        </div>
                        <div class="history-header__balance">
                            {{ formatCurrency(wallet.balance, wallet.currency) }}
                        </div>
                    </div>
                </q-card-section>
            </q-card>

            <q-card flat bordered class="statement">
                <!-- Column headers -->
                <div class="statement__row statement__row--head">
                    <div>{{ t('wallets.history.operation') }}</div>
                    <div class="text-right">{{ t('wallets.history.amount') }}</div>
                    <div class="text-right">{{ t('wallets.history.balance') }}</div>
                </div>

                <q-infinite-scroll :offset="300" @load="onLoad">
                    <template v-for="(entry, index) in entries" :key="entry.key">
                        <div v-if="isNewMonth(index)" class="statement__month">
                            {{ formatMonth(entry.date) }}
                        </div>

                        <div class="statement__row">
                            <div class="statement__operation">
                                <div class="statement__label ellipsis">
                                    <span class="statement__day">{{ formatDay(entry.date) }}</span>
                                    {{ entryTitle(entry) }}
                                </div>
                                <div class="statement__caption ellipsis">
                                    {{ entryCaption(entry) }}
                                </div>
                            </div>
                            <div
                                class="statement__amount text-right"
                                :class="entry.delta < 0 ? 'text-negative' : 'text-positive'"
                            >
                                {{ formatSignedCurrency(entry.delta, wallet.currency) }}
                            </div>
                            <div
                                class="statement__balance text-right"
                                :class="{ 'text-negative': entry.balanceAfter < 0 }"
                            >
                                {{ formatCurrency(entry.balanceAfter, wallet.currency) }}
                            </div>
                        </div>
                    </template>

                    <template #loading>
                        <div class="row justify-center q-my-md">
                            <q-spinner-dots color="primary" size="32px" />
                        </div>
                    </template>
                </q-infinite-scroll>

                <!-- End of history -->
                <template v-if="isDone">
                    <div v-if="entries.length === 0" class="statement__empty">
                        <q-icon name="receipt_long" size="48px" color="grey-4" />
                        <div class="text-grey-6 q-mt-sm">{{ t('wallets.history.empty') }}</div>
                    </div>

                    <div class="statement__row statement__row--opening">
                        <div class="statement__operation">
                            <div class="statement__label">
                                {{ t('wallets.history.openingBalance') }}
                            </div>
                            <div class="statement__caption">
                                {{ t('wallets.history.openingHint') }}
                            </div>
                        </div>
                        <div />
                        <div class="statement__balance text-right">
                            {{ formatCurrency(runningBalance, wallet.currency) }}
                        </div>
                    </div>
                </template>
            </q-card>
        </template>
    </q-page>
</template>

<script setup lang="ts">
import type { WalletHistoryEntry, WalletMovementKind } from 'src/types/wallet-history';
import {
    WALLET_HISTORY_PAGE_SIZE,
    fetchWalletMovements,
    withRunningBalance,
} from 'src/services/wallet-history';

const { t, locale } = useI18n();
const route = useRoute();
const walletStore = useWalletStore();
const { formatCurrency, formatSignedCurrency } = useCurrency();

usePage({ title: t('wallets.history.title'), showHeader: true, showBack: true });

const walletId = computed(() => route.params.id as string);
const wallet = computed(() => walletStore.getWalletById(walletId.value));

// State
const entries = ref<WalletHistoryEntry[]>([]);
/** Balance right before the oldest loaded movement */
const runningBalance = ref(0);
const isDone = ref(false);

/** Kinds whose label is another wallet, shown as a direction */
const TRANSFER_TITLES: Partial<Record<WalletMovementKind, string>> = {
    transfer_out: 'wallets.history.transferTo',
    transfer_in: 'wallets.history.transferFrom',
};

/**
 * Loads the next page of movements when the list nears the bottom.
 * @param _index - Page index provided by QInfiniteScroll (unused, the cursor drives paging)
 * @param done - Callback to signal the page is loaded; `true` stops further loading
 * @returns Promise resolving once the page is appended
 */
async function onLoad(_index: number, done: (stop?: boolean) => void): Promise<void> {
    try {
        await walletStore.loadAll();
        const current = wallet.value;
        if (!current) {
            isDone.value = true;
            done(true);
            return;
        }

        const last = entries.value.at(-1);
        if (!last) runningBalance.value = current.balance;

        const movements = await fetchWalletMovements(current.id, last?.cursor);
        const page = withRunningBalance(movements, runningBalance.value);
        entries.value.push(...page.entries);
        runningBalance.value = page.balanceBefore;

        const stop = movements.length < WALLET_HISTORY_PAGE_SIZE;
        isDone.value = stop;
        done(stop);
    } catch (error) {
        console.error('Failed to load wallet history:', error);
        done(true);
    }
}

/**
 * Whether the entry opens a new month, to print the month separator above it.
 * @param index - Position of the entry in the list
 * @returns True for the first entry and at each change of month
 */
function isNewMonth(index: number): boolean {
    if (index === 0) return true;
    const current = entries.value[index]!.date;
    const previous = entries.value[index - 1]!.date;
    return (
        current.getMonth() !== previous.getMonth() ||
        current.getFullYear() !== previous.getFullYear()
    );
}

/**
 * Formats the month separator.
 * @param date - Any date within the month
 * @returns The month and year, for example "septembre 2026"
 */
function formatMonth(date: Date): string {
    return new Intl.DateTimeFormat(locale.value, { month: 'long', year: 'numeric' }).format(date);
}

/**
 * Formats the day shown in front of an operation.
 * @param date - The operation date
 * @returns The two-digit day, for example "07"
 */
function formatDay(date: Date): string {
    return new Intl.DateTimeFormat(locale.value, { day: '2-digit' }).format(date);
}

/**
 * Main line of an operation: what it relates to.
 * @param entry - The history entry
 * @returns The localized title
 */
function entryTitle(entry: WalletHistoryEntry): string {
    const transferKey = TRANSFER_TITLES[entry.kind];
    const name = entry.label ?? t('wallets.history.unknown');
    return transferKey ? t(transferKey, { name }) : name;
}

/**
 * Secondary line of an operation: its nature, fee and note.
 * @param entry - The history entry
 * @returns The caption parts joined with a middle dot
 */
function entryCaption(entry: WalletHistoryEntry): string {
    const parts = [t(`wallets.history.kinds.${entry.kind}`)];
    if (entry.fee && wallet.value) {
        parts.push(
            t('wallets.history.fee', {
                amount: formatCurrency(entry.fee, wallet.value.currency),
            }),
        );
    }
    if (entry.description) parts.push(entry.description);
    return parts.join(' · ');
}
</script>

<style lang="scss" scoped>
.history-header {
    border-radius: 16px;

    &__balance {
        font-size: 22px;
        font-weight: 700;
        color: var(--q-primary);
    }
}

.statement {
    border-radius: 12px;
    overflow: hidden;

    &__row {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto auto;
        column-gap: 12px;
        align-items: center;
        padding: 10px 12px;
        border-top: 1px solid $border-color;

        &--head {
            border-top: none;
            background: $bg-subtle;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            color: $text-secondary;
        }

        &--opening {
            background: $bg-subtle;
            border-top: 2px solid $border-color;
        }
    }

    &__month {
        padding: 8px 12px 4px;
        font-size: 13px;
        font-weight: 600;
        text-transform: capitalize;
        color: $text-secondary;
        border-top: 1px solid $border-color;
    }

    &__operation {
        min-width: 0;
    }

    &__label {
        font-size: 14px;
        font-weight: 500;
        color: $text-primary;
    }

    &__day {
        display: inline-block;
        min-width: 22px;
        font-variant-numeric: tabular-nums;
        color: $text-secondary;
    }

    &__caption {
        font-size: 12px;
        color: $text-secondary;
        padding-left: 22px;
    }

    &__row--opening &__caption {
        padding-left: 0;
    }

    &__amount,
    &__balance {
        font-size: 13px;
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
    }

    &__amount {
        font-weight: 600;
    }

    &__balance {
        font-weight: 500;
        color: $text-primary;
    }

    &__empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 32px 16px;
    }
}
</style>
