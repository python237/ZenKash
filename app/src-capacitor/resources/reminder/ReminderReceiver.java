package com.zenkash.app.reminder;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.os.VibratorManager;
import android.util.Log;

import androidx.core.app.NotificationCompat;

import java.util.Calendar;

/**
 * BroadcastReceiver that handles the alarm trigger.
 * Checks if a transaction was recorded today and shows an alert if not.
 */
public class ReminderReceiver extends BroadcastReceiver {

    private static final String TAG = "ReminderReceiver";
    private static final String CHANNEL_ID = "zenkash_reminder";
    private static final int NOTIFICATION_ID = 2001;
    public static final String ACTION_STOP_VIBRATION = "com.zenkash.app.STOP_VIBRATION";
    
    // Static vibrator and media player to allow stopping from anywhere
    private static Vibrator sVibrator = null;
    private static MediaPlayer sMediaPlayer = null;

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        
        // Handle stop vibration action (when notification is dismissed or tapped)
        if (ACTION_STOP_VIBRATION.equals(action)) {
            Log.d(TAG, "Stop vibration and sound action received");
            stopAlarm();
            return;
        }
        
        Log.d(TAG, "onReceive called - Alarm triggered!");

        // Check if reminder is enabled
        if (!ReminderPlugin.isReminderEnabledStatic(context)) {
            Log.d(TAG, "Reminder not enabled, skipping");
            return;
        }
        Log.d(TAG, "Reminder is enabled");

        // Check if we're in the reminder window (21:30 - 23:59)
        Calendar now = Calendar.getInstance();
        int hour = now.get(Calendar.HOUR_OF_DAY);
        int minute = now.get(Calendar.MINUTE);
        
        if (hour < 21 || (hour == 21 && minute < 30)) {
            Log.d(TAG, "Outside reminder window (before 21:30), scheduling next");
            ReminderPlugin.scheduleNextAlarm(context);
            return;
        }

        // Check if transaction was already recorded today
        if (ReminderPlugin.hasTransactionTodayStatic(context)) {
            Log.d(TAG, "Transaction already recorded today, scheduling for tomorrow");
            ReminderPlugin.scheduleNextAlarm(context);
            return;
        }
        
        Log.d(TAG, "No transaction today - showing alert!");

        // No transaction recorded - show the full screen alert
        showFullScreenAlert(context);

        // Schedule next check in 5 minutes
        ReminderPlugin.scheduleNextAlarm(context);
    }

    /**
     * Shows the full screen alert activity.
     */
    private void showFullScreenAlert(Context context) {
        Log.d(TAG, "Creating notification with full screen intent");
        
        // Create notification channel (required for Android 8+)
        createNotificationChannel(context);
        
        // Intent to open the app when notification is tapped (also stops vibration)
        Intent openAppIntent = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        if (openAppIntent != null) {
            openAppIntent.putExtra("navigate_to", "transactions");
            openAppIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        }
        
        PendingIntent pendingIntent = PendingIntent.getActivity(
            context, 
            0, 
            openAppIntent, 
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        
        // Delete intent - stops vibration when notification is dismissed
        Intent deleteIntent = new Intent(context, ReminderReceiver.class);
        deleteIntent.setAction(ACTION_STOP_VIBRATION);
        PendingIntent deletePendingIntent = PendingIntent.getBroadcast(
            context,
            2,
            deleteIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        
        // Full screen intent for lock screen
        Intent fullScreenIntent = new Intent(context, FullScreenAlertActivity.class);
        fullScreenIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        PendingIntent fullScreenPendingIntent = PendingIntent.getActivity(
            context, 
            1, 
            fullScreenIntent, 
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        
        // Build notification with alarm sound
        Uri alarmSound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
        if (alarmSound == null) {
            alarmSound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
        }
        
        // Vibration pattern: wait 0ms, vibrate 500ms, wait 200ms, vibrate 500ms, wait 200ms, vibrate 500ms
        long[] vibrationPattern = {0, 500, 200, 500, 200, 500};
        
        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_alert)
            .setContentTitle("Zenkash - Rappel")
            .setContentText("Enregistrez vos transactions de la journée...")
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .setDeleteIntent(deletePendingIntent)
            .setFullScreenIntent(fullScreenPendingIntent, true)
            .setSound(alarmSound)
            .setVibrate(vibrationPattern)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC);
        
        NotificationManager notificationManager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        notificationManager.notify(NOTIFICATION_ID, builder.build());
        
        // Trigger manual vibration and sound to ensure they loop continuously
        triggerVibration(context, vibrationPattern);
        playAlarmSound(context);
        
        Log.d(TAG, "Notification sent!");
    }
    
    /**
     * Creates the notification channel for Android 8+.
     */
    private void createNotificationChannel(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            // Get alarm sound
            Uri alarmSound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
            if (alarmSound == null) {
                alarmSound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
            }
            
            AudioAttributes audioAttributes = new AudioAttributes.Builder()
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .setUsage(AudioAttributes.USAGE_ALARM)
                .build();
            
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Rappel Transactions",
                NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Rappel quotidien pour enregistrer vos transactions");
            channel.enableLights(true);
            channel.enableVibration(true);
            channel.setVibrationPattern(new long[]{0, 500, 200, 500, 200, 500});
            channel.setSound(alarmSound, audioAttributes);
            channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            channel.setBypassDnd(true); // Bypass Do Not Disturb
            
            NotificationManager notificationManager = context.getSystemService(NotificationManager.class);
            notificationManager.createNotificationChannel(channel);
            Log.d(TAG, "Notification channel created with alarm sound");
        }
    }
    
    /**
     * Triggers continuous vibration that repeats until stopped.
     * Uses repeat index 0 to loop from the beginning of the pattern.
     */
    private void triggerVibration(Context context, long[] pattern) {
        try {
            // Stop any existing vibration first
            stopVibration();
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                VibratorManager vibratorManager = (VibratorManager) context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE);
                sVibrator = vibratorManager.getDefaultVibrator();
            } else {
                sVibrator = (Vibrator) context.getSystemService(Context.VIBRATOR_SERVICE);
            }
            
            if (sVibrator != null) {
                // Use repeat index 0 to loop continuously from the start of pattern
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    sVibrator.vibrate(VibrationEffect.createWaveform(pattern, 0));
                } else {
                    sVibrator.vibrate(pattern, 0);
                }
                Log.d(TAG, "Continuous vibration started");
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to vibrate: " + e.getMessage());
        }
    }
    
    /**
     * Plays alarm sound in a loop until stopped.
     */
    private void playAlarmSound(Context context) {
        try {
            // Stop any existing sound first
            stopSound();
            
            Uri alarmSound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
            if (alarmSound == null) {
                alarmSound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
            }
            
            sMediaPlayer = new MediaPlayer();
            sMediaPlayer.setDataSource(context, alarmSound);
            
            // Set audio attributes for alarm
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                AudioAttributes audioAttributes = new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build();
                sMediaPlayer.setAudioAttributes(audioAttributes);
            }
            
            sMediaPlayer.setLooping(true); // Loop continuously
            sMediaPlayer.prepare();
            sMediaPlayer.start();
            
            Log.d(TAG, "Alarm sound started (looping)");
        } catch (Exception e) {
            Log.e(TAG, "Failed to play alarm sound: " + e.getMessage());
        }
    }
    
    /**
     * Stops the ongoing vibration.
     */
    private static void stopVibration() {
        if (sVibrator != null) {
            try {
                sVibrator.cancel();
                Log.d(TAG, "Vibration stopped");
            } catch (Exception e) {
                Log.e(TAG, "Failed to stop vibration: " + e.getMessage());
            }
            sVibrator = null;
        }
    }
    
    /**
     * Stops the ongoing alarm sound.
     */
    private static void stopSound() {
        if (sMediaPlayer != null) {
            try {
                if (sMediaPlayer.isPlaying()) {
                    sMediaPlayer.stop();
                }
                sMediaPlayer.release();
                Log.d(TAG, "Sound stopped");
            } catch (Exception e) {
                Log.e(TAG, "Failed to stop sound: " + e.getMessage());
            }
            sMediaPlayer = null;
        }
    }
    
    /**
     * Stops both vibration and sound.
     * Called when notification is dismissed or tapped.
     */
    public static void stopAlarm() {
        stopVibration();
        stopSound();
        Log.d(TAG, "Alarm stopped (vibration + sound)");
    }
}
