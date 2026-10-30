<template>
    <q-page class="zk-page">
        <div v-if="notificationStore.notifications.length === 0" class="zk-empty">
            <span class="zk-empty__icon">
                <q-icon name="o_notifications" size="30px" />
            </span>
            <span class="zk-empty__title">{{ t('notifications.empty') }}</span>
            <span>{{ t('notifications.emptyHint') }}</span>
        </div>

        <section v-for="group in groups" :key="group.key" class="day-group">
            <h2 class="date-header">{{ group.label }}</h2>
            <div class="day-card">
                <button
                    v-for="item in group.items"
                    :key="item.id"
                    type="button"
                    class="notification"
                    @click="open(item)"
                >
                    <span class="zk-tile" :class="`zk-tile--${view(item).tone}`">
                        <q-icon :name="view(item).icon" size="20px" />
                    </span>
                    <span class="notification__body">
                        <span class="notification__title">
                            {{ view(item).title }}
                            <span v-if="unreadIds.has(item.id)" class="notification__dot" />
                        </span>
                        <span class="notification__text">{{ view(item).text }}</span>
                    </span>
                    <span class="notification__time">{{ formatTime(item.createdAt) }}</span>
                </button>
            </div>
        </section>

        <ModalConfirm
            v-model="showClearConfirm"
            :title="t('notifications.clearTitle')"
            :message="t('notifications.clearMessage')"
            variant="danger"
            :confirm-label="t('notifications.clear')"
            @confirm="clearAll"
        />
    </q-page>
</template>

<script setup lang="ts">
import type { AppNotification } from 'src/types/notification';
import type { CurrencyCode } from 'src/types/currency';
import { useNotificationStore } from 'src/stores/notification';
import ModalConfirm from 'src/components/modals/ModalConfirm.vue';

const { t, locale } = useI18n();
const router = useRouter();
const notificationStore = useNotificationStore();
const { formatCurrency } = useCurrency();

const showClearConfirm = ref(false);

usePage({
    title: t('notifications.title'),
    showHeader: true,
    showBack: true,
    actions: computed(() =>
        notificationStore.notifications.length > 0
            ? [
                  {
                      icon: 'o_delete_sweep',
                      label: t('notifications.clear'),
                      variant: 'outline' as const,
                      onClick: () => (showClearConfirm.value = true),
                  },
              ]
            : [],
    ),
});

// Unread at the time the page was opened, so the dots stay visible while reading
const unreadIds = ref(new Set<string>());

/**
 * Local date key (YYYY-MM-DD) of a date.
 * @param date - The date
 * @returns The day key
 */
function dayKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// Notifications grouped by day, most recent first
const groups = computed(() => {
    const today = dayKey(new Date());
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = dayKey(yesterdayDate);

    const map = new Map<string, AppNotification[]>();
    for (const item of notificationStore.notifications) {
        const key = dayKey(item.createdAt);
        map.set(key, [...(map.get(key) ?? []), item]);
    }

    return [...map.entries()].map(([key, items]) => {
        let label: string;
        if (key === today) label = t('transactions.today');
        else if (key === yesterday) label = t('transactions.yesterday');
        else {
            label = new Intl.DateTimeFormat(locale.value, {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
            }).format(items[0]!.createdAt);
        }
        return { key, label, items };
    });
});

/**
 * Formats an amount stored in a notification payload.
 * @param item - The notification
 * @returns The formatted amount, or an empty string
 */
function payloadAmount(item: AppNotification): string {
    const { amount, currency } = item.payload;
    if (amount === undefined) return '';
    return formatCurrency(amount, currency as CurrencyCode | undefined);
}

/**
 * Icon, tone and localized texts of a notification.
 * @param item - The notification
 * @returns What to render
 */
function view(item: AppNotification): {
    icon: string;
    tone: string;
    title: string;
    text: string;
} {
    const label = item.payload.label || t('recurring.title');
    switch (item.type) {
        case 'daily_reminder':
            return {
                icon: 'o_alarm',
                tone: 'amber',
                title: t('notifications.dailyReminderTitle'),
                text: t('notifications.dailyReminderText'),
            };
        case 'recurring_posted':
            return {
                icon: 'autorenew',
                tone: item.payload.flow === 'income' ? 'green' : 'orange',
                title: t('notifications.recurringPostedTitle'),
                text: t(
                    'notifications.recurringPostedText',
                    { label, amount: payloadAmount(item), count: item.payload.count ?? 1 },
                    item.payload.count ?? 1,
                ),
            };
        case 'recurring_due':
            return {
                icon: 'o_event',
                tone: 'blue',
                title: t('notifications.recurringDueTitle'),
                text: t('notifications.recurringDueText', { label, amount: payloadAmount(item) }),
            };
        default:
            return { icon: 'o_notifications', tone: 'grey', title: '', text: '' };
    }
}

/**
 * Formats the time of a notification.
 * @param date - The notification date
 * @returns The HH:mm time
 */
function formatTime(date: Date): string {
    return new Intl.DateTimeFormat(locale.value, { hour: '2-digit', minute: '2-digit' }).format(
        date,
    );
}

/**
 * Opens the screen related to a notification.
 * @param item - The notification tapped
 */
function open(item: AppNotification): void {
    void router.push({ name: item.type === 'daily_reminder' ? 'transactions' : 'recurring' });
}

/**
 * Deletes the whole history.
 */
async function clearAll(): Promise<void> {
    await notificationStore.clearAll();
    showClearConfirm.value = false;
}

onMounted(async () => {
    await notificationStore.syncFiredReminders();
    await notificationStore.loadAll();
    unreadIds.value = new Set(
        notificationStore.notifications.filter((n) => !n.readAt).map((n) => n.id),
    );
    await notificationStore.markAllRead();
});
</script>

<style lang="scss" scoped>
.day-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.date-header {
    margin: 0;
    padding: 0 4px;
    font-size: 13px;
    font-weight: 600;
    line-height: 1.4;
    color: $text-secondary;
    text-transform: capitalize;
}

.day-card {
    background: $bg-card;
    border-radius: $radius-tile;
    overflow: hidden;
}

.notification {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 12px;
    min-height: 64px;
    padding: 12px 14px;
    border: 0;
    background: transparent;
    font-family: inherit;
    text-align: left;
    color: $text-primary;
    cursor: pointer;

    & + & {
        border-top: 1px solid $border-light;
    }

    &__body {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 2px;
    }

    &__title {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 14px;
        font-weight: 600;
    }

    &__dot {
        width: 8px;
        height: 8px;
        border-radius: 999px;
        background: $negative;
        flex-shrink: 0;
    }

    &__text {
        font-size: 12px;
        line-height: 1.4;
        color: $text-secondary;
    }

    &__time {
        align-self: flex-start;
        font-size: 11px;
        color: $text-muted;
    }
}
</style>
