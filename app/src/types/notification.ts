/**
 * Notification Types
 *
 * In-app notification history (bell on the dashboard). Texts are rendered from
 * the type and payload at display time, so they follow the current language.
 * @module types/notification
 */

/** Kinds of notifications recorded in the history */
export type NotificationType = 'daily_reminder' | 'recurring_posted' | 'recurring_due';

/** Data needed to render a notification */
export interface NotificationPayload {
    /** Label of the related item (recurring description or category) */
    label?: string;
    /** Amount involved */
    amount?: number;
    /** Currency code of the amount */
    currency?: string | undefined;
    /** Number of occurrences grouped in this notification */
    count?: number;
    /** Transaction type of the related recurring rule */
    flow?: 'income' | 'expense';
}

/** A notification stored in the history */
export interface AppNotification {
    id: string;
    type: NotificationType;
    payload: NotificationPayload;
    createdAt: Date;
    readAt?: Date | undefined;
}
