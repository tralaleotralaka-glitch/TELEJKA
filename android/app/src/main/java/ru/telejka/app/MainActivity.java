package ru.telejka.app;

import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.HapticFeedbackConstants;
import android.view.View;
import android.view.Window;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.widget.Toast;

import androidx.activity.OnBackPressedCallback;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;

import org.json.JSONObject;

public class MainActivity extends BridgeActivity {

    public static final String PREFS_NAME = "telejka_native_prefs";
    public static final String KEY_START_SCREEN = "startScreen";
    public static final String KEY_DESKTOP_UA = "desktopUserAgent";
    public static final String KEY_DOUBLE_BACK = "doubleBackExit";
    public static final String KEY_SHOW_HUB_BAR = "showFloatingHubButton";
    public static final String KEY_THEME = "theme";

    private long lastBackPressMs = 0L;
    private boolean autoStartHandled = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        applySystemBarsTheme(prefs.getString(KEY_THEME, "night"));

        if (getBridge() != null && getBridge().getWebView() != null) {
            WebView webView = getBridge().getWebView();
            webView.addJavascriptInterface(new TelejkaJsBridge(), "TelejkaNative");
        }

        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                WebView webView = (getBridge() != null) ? getBridge().getWebView() : null;
                if (webView != null && webView.canGoBack()) {
                    webView.goBack();
                    return;
                }

                SharedPreferences currentPrefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
                boolean doubleBackEnabled = currentPrefs.getBoolean(KEY_DOUBLE_BACK, true);
                if (!doubleBackEnabled) {
                    finish();
                    return;
                }

                long now = System.currentTimeMillis();
                if (now - lastBackPressMs < 2000L) {
                    finish();
                } else {
                    lastBackPressMs = now;
                    Toast.makeText(
                            MainActivity.this,
                            "Нажмите «Назад» ещё раз для выхода",
                            Toast.LENGTH_SHORT
                    ).show();
                }
            }
        });

        handleIncomingIntent(getIntent());

        if (savedInstanceState == null && !autoStartHandled) {
            autoStartHandled = true;
            String startScreen = prefs.getString(KEY_START_SCREEN, "hub");
            boolean desktopUa = prefs.getBoolean(KEY_DESKTOP_UA, false);
            boolean showHubBar = prefs.getBoolean(KEY_SHOW_HUB_BAR, true);

            if ("web_k".equals(startScreen)) {
                launchTelegramWeb("https://web.telegram.org/k/", "Telegram Web K", desktopUa, showHubBar);
            } else if ("web_a".equals(startScreen)) {
                launchTelegramWeb("https://web.telegram.org/a/", "Telegram Web A", desktopUa, showHubBar);
            }
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleIncomingIntent(intent);
    }

    private void handleIncomingIntent(Intent intent) {
        if (intent == null || !Intent.ACTION_VIEW.equals(intent.getAction())) {
            return;
        }
        Uri data = intent.getData();
        if (data == null) {
            return;
        }
        String scheme = data.getScheme();
        String host = data.getHost();
        if (("https".equalsIgnoreCase(scheme) || "http".equalsIgnoreCase(scheme))
                && host != null
                && (host.equalsIgnoreCase("t.me")
                || host.equalsIgnoreCase("telegram.me")
                || host.equalsIgnoreCase("web.telegram.org"))) {
            SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
            autoStartHandled = true;
            launchTelegramWeb(
                    data.toString(),
                    "Telegram",
                    prefs.getBoolean(KEY_DESKTOP_UA, false),
                    prefs.getBoolean(KEY_SHOW_HUB_BAR, true)
            );
        }
    }

    private void launchTelegramWeb(String url, String title, boolean desktopUa, boolean showHubBar) {
        Intent intent = new Intent(this, TelegramWebActivity.class);
        intent.putExtra(TelegramWebActivity.EXTRA_URL, url);
        intent.putExtra(TelegramWebActivity.EXTRA_TITLE, title);
        intent.putExtra(TelegramWebActivity.EXTRA_DESKTOP_UA, desktopUa);
        intent.putExtra(TelegramWebActivity.EXTRA_SHOW_BAR, showHubBar);
        startActivity(intent);
    }

    private void applySystemBarsTheme(String theme) {
        Window window = getWindow();
        if (window == null) return;

        int statusColor;
        int navColor;
        boolean lightIcons;

        if ("day".equals(theme)) {
            statusColor = Color.parseColor("#EFF2F6");
            navColor = Color.parseColor("#FFFFFF");
            lightIcons = true;
        } else if ("oled".equals(theme)) {
            statusColor = Color.parseColor("#000000");
            navColor = Color.parseColor("#0A0C10");
            lightIcons = false;
        } else {
            statusColor = Color.parseColor("#0E1621");
            navColor = Color.parseColor("#17212B");
            lightIcons = false;
        }

        window.setStatusBarColor(statusColor);
        window.setNavigationBarColor(navColor);

        WindowInsetsControllerCompat controller =
                WindowCompat.getInsetsController(window, window.getDecorView());
        if (controller != null) {
            controller.setAppearanceLightStatusBars(lightIcons);
            controller.setAppearanceLightNavigationBars(lightIcons);
        }
    }

    private final class TelejkaJsBridge {

        @JavascriptInterface
        public void openTelegramWeb(
                final String url,
                final String title,
                final boolean desktopUa,
                final boolean showHubButton
        ) {
            runOnUiThread(() -> launchTelegramWeb(url, title, desktopUa, showHubButton));
        }

        @JavascriptInterface
        public void openExternalUrl(final String url) {
            runOnUiThread(() -> {
                try {
                    Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    startActivity(intent);
                } catch (Exception e) {
                    Toast.makeText(
                            MainActivity.this,
                            "Не найдено приложение для открытия ссылки",
                            Toast.LENGTH_SHORT
                    ).show();
                }
            });
        }

        @JavascriptInterface
        public void saveNativePrefs(final String jsonPrefs) {
            try {
                JSONObject obj = new JSONObject(jsonPrefs);
                SharedPreferences.Editor editor =
                        getSharedPreferences(PREFS_NAME, MODE_PRIVATE).edit();
                if (obj.has(KEY_START_SCREEN)) {
                    editor.putString(KEY_START_SCREEN, obj.optString(KEY_START_SCREEN, "hub"));
                }
                if (obj.has(KEY_DESKTOP_UA)) {
                    editor.putBoolean(KEY_DESKTOP_UA, obj.optBoolean(KEY_DESKTOP_UA, false));
                }
                if (obj.has(KEY_DOUBLE_BACK)) {
                    editor.putBoolean(KEY_DOUBLE_BACK, obj.optBoolean(KEY_DOUBLE_BACK, true));
                }
                if (obj.has(KEY_SHOW_HUB_BAR)) {
                    editor.putBoolean(KEY_SHOW_HUB_BAR, obj.optBoolean(KEY_SHOW_HUB_BAR, true));
                }
                if (obj.has(KEY_THEME)) {
                    final String theme = obj.optString(KEY_THEME, "night");
                    editor.putString(KEY_THEME, theme);
                    runOnUiThread(() -> applySystemBarsTheme(theme));
                }
                editor.apply();
            } catch (Exception ignored) {
                // Ignore malformed JSON
            }
        }

        @JavascriptInterface
        public boolean clearWebViewCache() {
            runOnUiThread(() -> {
                if (getBridge() != null && getBridge().getWebView() != null) {
                    getBridge().getWebView().clearCache(true);
                }
            });
            return true;
        }

        @JavascriptInterface
        public String getBuildInfo() {
            try {
                JSONObject info = new JSONObject();
                info.put("isNativeAndroid", true);
                info.put("packageId", BuildConfig.APPLICATION_ID);
                info.put("versionName", BuildConfig.VERSION_NAME);
                info.put("versionCode", BuildConfig.VERSION_CODE);
                info.put("androidSdk", Build.VERSION.SDK_INT);
                info.put("engine", "Android WebView + Capacitor 7");
                return info.toString();
            } catch (Exception e) {
                return "{\"isNativeAndroid\":true}";
            }
        }

        @JavascriptInterface
        public void vibrateShort() {
            runOnUiThread(() -> {
                View decor = getWindow().getDecorView();
                if (decor != null) {
                    decor.performHapticFeedback(HapticFeedbackConstants.KEYBOARD_TAP);
                }
            });
        }
    }
}
