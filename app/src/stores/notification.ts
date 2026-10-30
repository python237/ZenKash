import { defineStore } from 'pinia';
import { v4 as uuidv4 } from 'uuid';
import { Capacitor } from '@capacitor/core';
import type {
    AppNotification,
    NotificationPayload,
    NotificationType,
} from 'src/types/notification';
import { execute, query } from 'src/services/database';
import { ReminderPlugin } from 'src/plugins/reminder';

/**
 * Database row shape for the notifications table
 */
interface NotificationRow {
    id: string;
    type: string;
    payload: string;
    created_at: string;
    read_at: string | null;
}

/**
 * Converts a database row to an AppNotification.
 * @param row - The database row
 * @returns The notification
 */
function rowToNotification(row: NotificationRow): AppNotification {
    let payload: NotificationPayload = {};
    try {
        payload = JSON.parse(row.payload) as NotificationPayload;
    } catch {
        // Corrupted payload: keep the entry, render it without details
    }
    return {
        id: row.id,
        type: row.type as NotificationType,
        payload,
        createdAt: new Date(row.created_at),
        readAt: row.read_at ? new Date(row.read_at) : undefined,
    };
}

/**
 * Notification store: in-app history of reminders and automatic events.
 */
export const useNotificationStore = defineStore('notification', () => {
    const notifications = ref<AppNotification[]>([]);
    const isLoaded = ref(false);

    const unreadCount = computed(() => notifications.value.filter((n) => !n.readAt).length);

    /**
     * Loads the history, most recent first.
     */
    async function loadAll(): Promise<void> {
        const rows = await query<NotificationRow>(
            'SELECT * FROM notifications ORDER BY created_at DESC',
        );
        notifications.value = rows.map(rowToNotification);
        isLoaded.value = true;
    }

    /**
     * Records a notification. Passing a stable id makes the call idempotent.
     * @param type - The notification kind
     * @param payload - Data used to render the text
     * @param createdAt - When the event happened (defaults to now)
     * @param id - Optional stable id, ignored if it already exists
     */
    async function add(
        type: NotificationType,
        payload: NotificationPayload = {},
        createdAt: Date = new Date(),
        id: string = uuidv4(),
    ): Promise<void> {
        await execute(
            'INSERT OR IGNORE INTO notifications (id, type, payload, created_at) VALUES (?, ?, ?, ?)',
            [id, type, JSON.stringify(payload), createdAt.toISOString()],
        );
        if (isLoaded.value) await loadAll();
    }

    /**
     * Imports the evening reminders fired by the native alarm, including while
     * the app was closed. The alarm can repeat during the evening, so only the
     * first one of each day is kept.
     */
    async function syncFiredReminders(): Promise<void> {
        if (!Capacitor.isNativePlatform()) return;
        const { timestamps } = await ReminderPlugin.consumeFiredReminders();
        for (const timestamp of [...timestamps].sort((a, b) => a - b)) {
            const date = new Date(timestamp);
            const day = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            await add('daily_reminder', {}, date, `reminder-${day}`);
        }
    }

    /**
     * Marks every notification as read.
     */
    async function markAllRead(): Promise<void> {
        if (unreadCount.value === 0) return;
        const now = new Date().toISOString();
        await execute('UPDATE notifications SET read_at = ? WHERE read_at IS NULL', [now]);
        notifications.value = notifications.value.map((n) =>
            n.readAt ? n : { ...n, readAt: new Date(now) },
        );
    }

    /**
     * Deletes the whole history.
     */
    async function clearAll(): Promise<void> {
        await execute('DELETE FROM notifications');
        notifications.value = [];
    }

    return {
        notifications,
        unreadCount,
        loadAll,
        add,
        syncFiredReminders,
        markAllRead,
        clearAll,
    };
});
