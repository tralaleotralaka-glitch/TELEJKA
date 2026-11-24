package ru.telejka.app;

import android.annotation.SuppressLint;
import android.app.DownloadManager;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
import android.view.View;
import android.view.Window;
import android.webkit.CookieManager;
import android.webkit.DownloadListener;
import android.webkit.URLUtil;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.activity.OnBackPressedCallback;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;

public class TelegramWebActivity extends AppCompatActivity {

    public static final String EXTRA_URL = "extra_url";
    public static final String EXTRA_TITLE = "extra_title";
    public static final String EXTRA_DESKTOP_UA = "extra_desktop_ua";
    public static final String EXTRA_SHOW_BAR = "extra_show_bar";

    private static final String DESKTOP_UA =
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

    private WebView webView;
    private ProgressBar progressBar;
    private TextView titleView;
    private String initialHost = "";

    private ValueCallback<Uri[]> filePathCallback;

    private final ActivityResultLauncher<Intent> fileChooserLauncher =
            registerForActivityResult(
                    new ActivityResultContracts.StartActivityForResult(),
                    result -> {
                        if (filePathCallback == null) return;
                        Uri[] results = WebChromeClient.FileChooserParams.parseResult(
                                result.getResultCode(),
                                result.getData()
                        );
                        filePathCallback.onReceiveValue(results);
                        filePathCallback = null;
                    }
            );

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_telegram_web);

        SharedPreferences prefs = getSharedPreferences(MainActivity.PREFS_NAME, MODE_PRIVATE);
        String theme = prefs.getString(MainActivity.KEY_THEME, "night");
        applyTheme(theme);

        String targetUrl = getIntent().getStringExtra(EXTRA_URL);
        if (targetUrl == null || targetUrl.trim().isEmpty()) {
            targetUrl = "https://web.telegram.org/k/";
        }
        String title = getIntent().getStringExtra(EXTRA_TITLE);
        if (title == null || title.trim().isEmpty()) {
            title = "Telegram Web";
        }
        boolean desktopUa = getIntent().getBooleanExtra(EXTRA_DESKTOP_UA, false);
        boolean showBar = getIntent().getBooleanExtra(EXTRA_SHOW_BAR, true);

        Uri parsedInitial = Uri.parse(targetUrl);
        if (parsedInitial != null && parsedInitial.getHost() != null) {
            initialHost = parsedInitial.getHost().toLowerCase();
        }

        LinearLayout topBar = findViewById(R.id.telejkaTopBar);
        titleView = findViewById(R.id.tvWebTitle);
        progressBar = findViewById(R.id.webProgressBar);
        webView = findViewById(R.id.telegramWebView);

        titleView.setText(title);
        topBar.setVisibility(showBar ? View.VISIBLE : View.GONE);

        Button btnBackHub = findViewById(R.id.btnBackHub);
        Button btnSwitchK = findViewById(R.id.btnSwitchK);
        Button btnSwitchA = findViewById(R.id.btnSwitchA);
        Button btnReload = findViewById(R.id.btnReload);

        btnBackHub.setOnClickListener(v -> finish());
        btnSwitchK.setOnClickListener(v -> {
            titleView.setText("Telegram Web K");
            webView.loadUrl("https://web.telegram.org/k/");
        });
        btnSwitchA.setOnClickListener(v -> {
            titleView.setText("Telegram Web A");
            webView.loadUrl("https://web.telegram.org/a/");
        });
        btnReload.setOnClickListener(v -> webView.reload());

        configureWebView(desktopUa);

        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (webView != null && webView.canGoBack()) {
                    webView.goBack();
                } else {
                    finish();
                }
            }
        });

        webView.loadUrl(targetUrl);
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void configureWebView(boolean desktopUa) {
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setSupportZoom(true);
        settings.setBuiltInZoomControls(true);
        settings.setDisplayZoomControls(false);
        settings.setUseWideViewPort(desktopUa);
        settings.setLoadWithOverviewMode(desktopUa);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);

        if (desktopUa) {
            settings.setUserAgentString(DESKTOP_UA);
        }

        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setAcceptCookie(true);
        cookieManager.setAcceptThirdPartyCookies(webView, true);

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (uri == null) return false;
                String scheme = uri.getScheme() != null ? uri.getScheme().toLowerCase() : "";
                String host = uri.getHost() != null ? uri.getHost().toLowerCase() : "";

                // Open tg://, mailto:, tel:, intent: via system apps
                if (!"http".equals(scheme) && !"https".equals(scheme)) {
                    openExternally(uri);
                    return true;
                }

                // Keep Telegram domains and user's custom mirror inside the WebView
                boolean isTelegramHost =
                        host.endsWith(".telegram.org")
                                || host.equals("telegram.org")
                                || host.equals("t.me")
                                || host.equals("telegram.me")
                                || (!initialHost.isEmpty() && host.equals(initialHost));

                if (isTelegramHost) {
                    return false;
                }

                openExternally(uri);
                return true;
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int newProgress) {
                if (newProgress >= 100) {
                    progressBar.setVisibility(View.GONE);
                } else {
                    progressBar.setVisibility(View.VISIBLE);
                    progressBar.setProgress(newProgress);
                }
            }

            @Override
            public boolean onShowFileChooser(
                    WebView webView,
                    ValueCallback<Uri[]> filePathCallback,
                    FileChooserParams fileChooserParams
            ) {
                if (TelegramWebActivity.this.filePathCallback != null) {
                    TelegramWebActivity.this.filePathCallback.onReceiveValue(null);
                }
                TelegramWebActivity.this.filePathCallback = filePathCallback;

                try {
                    Intent chooserIntent = fileChooserParams.createIntent();
                    fileChooserLauncher.launch(chooserIntent);
                    return true;
                } catch (Exception e) {
                    TelegramWebActivity.this.filePathCallback = null;
                    Toast.makeText(
                            TelegramWebActivity.this,
                            "Не удалось открыть выбор файлов",
                            Toast.LENGTH_SHORT
                    ).show();
                    return false;
                }
            }
        });

        webView.setDownloadListener(new DownloadListener() {
            @Override
            public void onDownloadStart(
                    String url,
                    String userAgent,
                    String contentDisposition,
                    String mimeType,
                    long contentLength
            ) {
                try {
                    DownloadManager.Request req = new DownloadManager.Request(Uri.parse(url));
                    req.setMimeType(mimeType);
                    String cookies = CookieManager.getInstance().getCookie(url);
                    if (cookies != null) {
                        req.addRequestHeader("cookie", cookies);
                    }
                    req.addRequestHeader("User-Agent", userAgent);
                    String fileName = URLUtil.guessFileName(url, contentDisposition, mimeType);
                    req.setTitle(fileName);
                    req.setDescription("Загрузка через TELEJKA");
                    req.setNotificationVisibility(
                            DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED
                    );
                    req.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, fileName);

                    DownloadManager dm = (DownloadManager) getSystemService(DOWNLOAD_SERVICE);
                    if (dm != null) {
                        dm.enqueue(req);
                        Toast.makeText(
                                TelegramWebActivity.this,
                                "Загрузка: " + fileName,
                                Toast.LENGTH_SHORT
                        ).show();
                    }
                } catch (Exception e) {
                    openExternally(Uri.parse(url));
                }
            }
        });
    }

    private void openExternally(Uri uri) {
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, uri);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(intent);
        } catch (Exception e) {
            Toast.makeText(this, "Не удалось открыть ссылку", Toast.LENGTH_SHORT).show();
        }
    }

    private void applyTheme(String theme) {
        Window window = getWindow();
        if (window == null) return;

        int barColor;
        boolean lightIcons;
        if ("day".equals(theme)) {
            barColor = Color.parseColor("#EFF2F6");
            lightIcons = true;
        } else if ("oled".equals(theme)) {
            barColor = Color.parseColor("#000000");
            lightIcons = false;
        } else {
            barColor = Color.parseColor("#0E1621");
            lightIcons = false;
        }

        window.setStatusBarColor(barColor);
        window.setNavigationBarColor(barColor);
        WindowInsetsControllerCompat controller =
                WindowCompat.getInsetsController(window, window.getDecorView());
        if (controller != null) {
            controller.setAppearanceLightStatusBars(lightIcons);
            controller.setAppearanceLightNavigationBars(lightIcons);
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) {
            webView.onResume();
        }
    }

    @Override
    protected void onPause() {
        CookieManager.getInstance().flush();
        if (webView != null) {
            webView.onPause();
        }
        super.onPause();
    }

    @Override
    protected void onDestroy() {
        if (filePathCallback != null) {
            filePathCallback.onReceiveValue(null);
            filePathCallback = null;
        }
        if (webView != null) {
            webView.stopLoading();
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }
}
