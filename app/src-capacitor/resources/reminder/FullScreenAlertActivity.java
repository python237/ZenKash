package com.zenkash.app.reminder;

import android.app.Activity;
import android.app.KeyguardManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Build;
import android.os.Bundle;
import android.os.PowerManager;
import android.view.View;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.TextView;

/**
 * Full screen activity that displays the transaction reminder.
 * This activity can turn on the screen and show over the lock screen.
 */
public class FullScreenAlertActivity extends Activity {

    public static final String ACTION_DISMISS = "com.zenkash.app.ACTION_DISMISS_REMINDER";
    
    private PowerManager.WakeLock wakeLock;
    private BroadcastReceiver dismissReceiver;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Make the activity show over lock screen and turn on the screen
        setupWindowFlags();

        // Acquire wake lock to keep screen on
        acquireWakeLock();

        // Set up the UI
        setupUI();

        // Register receiver to dismiss from plugin
        registerDismissReceiver();
    }

    /**
     * Sets up window flags to show over lock screen and turn on display.
     */
    private void setupWindowFlags() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
            KeyguardManager keyguardManager = (KeyguardManager) getSystemService(Context.KEYGUARD_SERVICE);
            if (keyguardManager != null) {
                keyguardManager.requestDismissKeyguard(this, null);
            }
        } else {
            getWindow().addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED |
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON |
                WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD
            );
        }

        // Keep screen on while this activity is visible
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        
        // Full screen
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN);
    }

    /**
     * Acquires a wake lock to ensure the screen stays on.
     */
    private void acquireWakeLock() {
        PowerManager powerManager = (PowerManager) getSystemService(Context.POWER_SERVICE);
        if (powerManager != null) {
            wakeLock = powerManager.newWakeLock(
                PowerManager.FULL_WAKE_LOCK |
                PowerManager.ACQUIRE_CAUSES_WAKEUP |
                PowerManager.ON_AFTER_RELEASE,
                "zenkash:ReminderWakeLock"
            );
            wakeLock.acquire(60 * 1000L); // 60 seconds max
        }
    }

    /**
     * Sets up the user interface programmatically.
     * Using programmatic UI to avoid needing layout XML files.
     */
    private void setupUI() {
        // Create a simple layout programmatically
        android.widget.LinearLayout layout = new android.widget.LinearLayout(this);
        layout.setOrientation(android.widget.LinearLayout.VERTICAL);
        layout.setGravity(android.view.Gravity.CENTER);
        layout.setBackgroundColor(0xFF1A1A2E); // Dark blue background
        layout.setPadding(48, 48, 48, 48);

        // Icon (using emoji as text for simplicity)
        TextView iconView = new TextView(this);
        iconView.setText("💰");
        iconView.setTextSize(72);
        iconView.setGravity(android.view.Gravity.CENTER);
        layout.addView(iconView);

        // Spacer
        View spacer1 = new View(this);
        spacer1.setLayoutParams(new android.widget.LinearLayout.LayoutParams(
            android.widget.LinearLayout.LayoutParams.MATCH_PARENT, 48));
        layout.addView(spacer1);

        // Title
        TextView titleView = new TextView(this);
        titleView.setText("Rappel Zenkash");
        titleView.setTextSize(28);
        titleView.setTextColor(0xFFFFFFFF);
        titleView.setGravity(android.view.Gravity.CENTER);
        titleView.setTypeface(null, android.graphics.Typeface.BOLD);
        layout.addView(titleView);

        // Spacer
        View spacer2 = new View(this);
        spacer2.setLayoutParams(new android.widget.LinearLayout.LayoutParams(
            android.widget.LinearLayout.LayoutParams.MATCH_PARENT, 24));
        layout.addView(spacer2);

        // Message
        TextView messageView = new TextView(this);
        messageView.setText("Enregistrez vos transactions de la journée...");
        messageView.setTextSize(20);
        messageView.setTextColor(0xFFB8B8D1);
        messageView.setGravity(android.view.Gravity.CENTER);
        layout.addView(messageView);

        // Spacer
        View spacer3 = new View(this);
        spacer3.setLayoutParams(new android.widget.LinearLayout.LayoutParams(
            android.widget.LinearLayout.LayoutParams.MATCH_PARENT, 48));
        layout.addView(spacer3);

        // Sub-message
        TextView subMessageView = new TextView(this);
        subMessageView.setText("N'oubliez pas de noter vos dépenses et revenus du jour !");
        subMessageView.setTextSize(16);
        subMessageView.setTextColor(0xFF8888AA);
        subMessageView.setGravity(android.view.Gravity.CENTER);
        layout.addView(subMessageView);

        // Spacer
        View spacer4 = new View(this);
        spacer4.setLayoutParams(new android.widget.LinearLayout.LayoutParams(
            android.widget.LinearLayout.LayoutParams.MATCH_PARENT, 64));
        layout.addView(spacer4);

        // Open App Button
        Button openAppButton = new Button(this);
        openAppButton.setText("Ouvrir Zenkash");
        openAppButton.setTextSize(18);
        openAppButton.setBackgroundColor(0xFF4CAF50);
        openAppButton.setTextColor(0xFFFFFFFF);
        openAppButton.setPadding(48, 24, 48, 24);
        openAppButton.setOnClickListener(v -> openMainApp());
        
        android.widget.LinearLayout.LayoutParams buttonParams = new android.widget.LinearLayout.LayoutParams(
            android.widget.LinearLayout.LayoutParams.WRAP_CONTENT,
            android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
        );
        buttonParams.setMargins(0, 0, 0, 24);
        openAppButton.setLayoutParams(buttonParams);
        layout.addView(openAppButton);

        // Dismiss Button
        Button dismissButton = new Button(this);
        dismissButton.setText("Plus tard");
        dismissButton.setTextSize(16);
        dismissButton.setBackgroundColor(0x00000000); // Transparent
        dismissButton.setTextColor(0xFF8888AA);
        dismissButton.setOnClickListener(v -> finish());
        layout.addView(dismissButton);

        setContentView(layout);
    }

    /**
     * Opens the main Zenkash app.
     */
    private void openMainApp() {
        Intent launchIntent = getPackageManager().getLaunchIntentForPackage(getPackageName());
        if (launchIntent != null) {
            launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            launchIntent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);
            startActivity(launchIntent);
        }
        finish();
    }

    /**
     * Registers a broadcast receiver to allow dismissing from the plugin.
     */
    private void registerDismissReceiver() {
        dismissReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                finish();
            }
        };
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(dismissReceiver, new IntentFilter(ACTION_DISMISS), Context.RECEIVER_NOT_EXPORTED);
        } else {
            registerReceiver(dismissReceiver, new IntentFilter(ACTION_DISMISS));
        }
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        
        // Stop vibration and sound when activity is closed
        ReminderReceiver.stopAlarm();
        
        // Release wake lock
        if (wakeLock != null && wakeLock.isHeld()) {
            wakeLock.release();
        }
        
        // Unregister receiver
        if (dismissReceiver != null) {
            try {
                unregisterReceiver(dismissReceiver);
            } catch (Exception e) {
                // Ignore if already unregistered
            }
        }
    }
}
