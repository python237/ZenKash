package com.zenkash.app.reminder;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.provider.Settings;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.Calendar;

/**
 * Capacitor plugin for transaction reminder functionality.
 * Schedules periodic checks between 21:30 and 23:59 to remind users
 * to record their daily transactions.
 */
@CapacitorPlugin(name = "ReminderPlugin")
public class ReminderPlugin extends Plugin {

    private static final String TAG = "ReminderPlugin";

    private static final String PREFS_NAME = "ZenkashReminderPrefs";
    private static final String KEY_REMINDER_ENABLED = "reminder_enabled";
    private static final String KEY_LAST_TRANSACTION_DATE = "last_transaction_date";
    private static final int ALARM_REQUEST_CODE = 1001;

    /**
     * Enables the daily transaction reminder.
     * Schedules alarms to check every 5 minutes between 21:30 and 23:59.
     */
    @PluginMethod
    public void enableReminder(PluginCall call) {
        Log.d(TAG, "enableReminder called");
        Context context = getContext();
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit().putBoolean(KEY_REMINDER_ENABLED, true).apply();
        Log.d(TAG, "Reminder enabled in prefs, scheduling alarm...");

        scheduleNextAlarm(context);

        JSObject ret = new JSObject();
        ret.put("enabled", true);
        call.resolve(ret);
        Log.d(TAG, "enableReminder completed");
    }

    /**
     * Disables the daily transaction reminder.
     * Cancels all scheduled alarms.
     */
    @PluginMethod
    public void disableReminder(PluginCall call) {
        Context context = getContext();
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit().putBoolean(KEY_REMINDER_ENABLED, false).apply();

        cancelAlarm(context);

        JSObject ret = new JSObject();
        ret.put("enabled", false);
        call.resolve(ret);
    }

    /**
     * Checks if the reminder is currently enabled.
     */
    @PluginMethod
    public void isReminderEnabled(PluginCall call) {
        Context context = getContext();
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        boolean enabled = prefs.getBoolean(KEY_REMINDER_ENABLED, false);

        JSObject ret = new JSObject();
        ret.put("enabled", enabled);
        call.resolve(ret);
    }

    /**
     * Records that a transaction was made today.
     * This prevents the reminder from showing.
     */
    @PluginMethod
    public void recordTransaction(PluginCall call) {
        Context context = getContext();
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        
        String today = getTodayDateString();
        prefs.edit().putString(KEY_LAST_TRANSACTION_DATE, today).apply();

        JSObject ret = new JSObject();
        ret.put("recorded", true);
        ret.put("date", today);
        call.resolve(ret);
    }

    /**
     * Checks if a transaction was recorded today.
     */
    @PluginMethod
    public void hasTransactionToday(PluginCall call) {
        Context context = getContext();
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        
        String lastDate = prefs.getString(KEY_LAST_TRANSACTION_DATE, "");
        String today = getTodayDateString();
        boolean hasTransaction = today.equals(lastDate);

        JSObject ret = new JSObject();
        ret.put("hasTransaction", hasTransaction);
        ret.put("lastDate", lastDate);
        ret.put("today", today);
        call.resolve(ret);
    }

    /**
     * Checks if the app has permission to schedule exact alarms.
     * Required for Android 12+ (API 31+).
     */
    @PluginMethod
    public void canScheduleExactAlarms(PluginCall call) {
        Context context = getContext();
        boolean canSchedule = true;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            canSchedule = alarmManager.canScheduleExactAlarms();
        }

        JSObject ret = new JSObject();
        ret.put("canSchedule", canSchedule);
        call.resolve(ret);
    }

    /**
     * Opens the system settings to allow scheduling exact alarms.
     * Only needed for Android 12+ (API 31+).
     */
    @PluginMethod
    public void openAlarmSettings(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            Intent intent = new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM);
            getActivity().startActivity(intent);
        }
        call.resolve();
    }

    /**
     * Dismisses the current reminder alert if showing.
     */
    @PluginMethod
    public void dismissAlert(PluginCall call) {
        Context context = getContext();
        Intent intent = new Intent(FullScreenAlertActivity.ACTION_DISMISS);
        context.sendBroadcast(intent);
        call.resolve();
    }

    /**
     * Schedules the next alarm for reminder check.
     * Runs every 5 minutes between 21:30 and 23:59.
     */
    public static void scheduleNextAlarm(Context context) {
        Log.d(TAG, "scheduleNextAlarm called");
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        Intent intent = new Intent(context, ReminderReceiver.class);
        PendingIntent pendingIntent = PendingIntent.getBroadcast(
            context,
            ALARM_REQUEST_CODE,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        // Calculate next trigger time
        Calendar now = Calendar.getInstance();
        Calendar triggerCal = Calendar.getInstance();
        
        int currentHour = now.get(Calendar.HOUR_OF_DAY);
        int currentMinute = now.get(Calendar.MINUTE);
        
        // If before 21:30, schedule for 21:30 today
        if (currentHour < 21 || (currentHour == 21 && currentMinute < 30)) {
            triggerCal.set(Calendar.HOUR_OF_DAY, 21);
            triggerCal.set(Calendar.MINUTE, 30);
            triggerCal.set(Calendar.SECOND, 0);
            triggerCal.set(Calendar.MILLISECOND, 0);
            Log.d(TAG, "Scheduling for 21:30 today");
        }
        // If between 21:30 and 23:54, schedule for next 5-minute interval
        else if (currentHour < 23 || (currentHour == 23 && currentMinute < 55)) {
            // Round up to next 5-minute mark
            int nextMinute = ((currentMinute / 5) + 1) * 5;
            if (nextMinute >= 60) {
                triggerCal.add(Calendar.HOUR_OF_DAY, 1);
                triggerCal.set(Calendar.MINUTE, nextMinute - 60);
            } else {
                triggerCal.set(Calendar.MINUTE, nextMinute);
            }
            triggerCal.set(Calendar.SECOND, 0);
            triggerCal.set(Calendar.MILLISECOND, 0);
            Log.d(TAG, "Scheduling for next 5-minute interval: " + triggerCal.get(Calendar.HOUR_OF_DAY) + ":" + triggerCal.get(Calendar.MINUTE));
        }
        // If after 23:55, schedule for 21:30 tomorrow
        else {
            triggerCal.add(Calendar.DAY_OF_YEAR, 1);
            triggerCal.set(Calendar.HOUR_OF_DAY, 21);
            triggerCal.set(Calendar.MINUTE, 30);
            triggerCal.set(Calendar.SECOND, 0);
            triggerCal.set(Calendar.MILLISECOND, 0);
            Log.d(TAG, "Scheduling for 21:30 tomorrow");
        }
        
        long triggerTime = triggerCal.getTimeInMillis();
        Log.d(TAG, "Scheduling alarm for " + triggerTime);

        // Schedule the alarm
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            alarmManager.setExactAndAllowWhileIdle(
                AlarmManager.RTC_WAKEUP,
                triggerTime,
                pendingIntent
            );
            Log.d(TAG, "Alarm scheduled with setExactAndAllowWhileIdle");
        } else {
            alarmManager.setExact(
                AlarmManager.RTC_WAKEUP,
                triggerTime,
                pendingIntent
            );
            Log.d(TAG, "Alarm scheduled with setExact");
        }
    }

    /**
     * Cancels all scheduled reminder alarms.
     */
    private void cancelAlarm(Context context) {
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        Intent intent = new Intent(context, ReminderReceiver.class);
        PendingIntent pendingIntent = PendingIntent.getBroadcast(
            context,
            ALARM_REQUEST_CODE,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        alarmManager.cancel(pendingIntent);
    }

    /**
     * Gets today's date as a string in YYYY-MM-DD format.
     */
    private String getTodayDateString() {
        Calendar calendar = Calendar.getInstance();
        int year = calendar.get(Calendar.YEAR);
        int month = calendar.get(Calendar.MONTH) + 1;
        int day = calendar.get(Calendar.DAY_OF_MONTH);
        return String.format("%04d-%02d-%02d", year, month, day);
    }

    /**
     * Checks if a transaction was recorded today (static version for receiver).
     */
    public static boolean hasTransactionTodayStatic(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String lastDate = prefs.getString(KEY_LAST_TRANSACTION_DATE, "");
        
        Calendar calendar = Calendar.getInstance();
        int year = calendar.get(Calendar.YEAR);
        int month = calendar.get(Calendar.MONTH) + 1;
        int day = calendar.get(Calendar.DAY_OF_MONTH);
        String today = String.format("%04d-%02d-%02d", year, month, day);
        
        return today.equals(lastDate);
    }

    /**
     * Checks if reminder is enabled (static version for receiver).
     */
    public static boolean isReminderEnabledStatic(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        return prefs.getBoolean(KEY_REMINDER_ENABLED, false);
    }
}
