package com.zenkash.app.reminder;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/**
 * BroadcastReceiver that re-schedules alarms after device boot.
 * Alarms are cleared when the device restarts, so we need to reschedule them.
 */
public class BootReceiver extends BroadcastReceiver {

    @Override
    public void onReceive(Context context, Intent intent) {
        if (Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction())) {
            // Check if reminder is enabled
            if (ReminderPlugin.isReminderEnabledStatic(context)) {
                // Re-schedule the alarm
                ReminderPlugin.scheduleNextAlarm(context);
            }
        }
    }
}
