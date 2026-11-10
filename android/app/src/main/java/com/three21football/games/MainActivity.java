package com.three21football.games;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;

/**
 * Real Android launcher for the existing 3-2-1 Football multiplayer game.
 * The game itself remains served by the existing HTTPS backend.
 */
public final class MainActivity extends Activity {
    private static final String HOST = "three21-futbol-duellosu.onrender.com";
    private static final String GAME_URL = "https://" + HOST + "/?android=1";
    private static final int BG = Color.rgb(7, 16, 24);
    private static final int SURFACE = Color.rgb(15, 43, 46);
    private static final int LIME = Color.rgb(184, 246, 106);
    private static final int WHITE = Color.rgb(239, 255, 244);
    private static final int MUTED = Color.rgb(170, 200, 195);

    private WebView webView;
    private ProgressBar loading;
    private LinearLayout errorPanel;

    private int dp(float n) {
        return (int) (n * getResources().getDisplayMetrics().density + 0.5f);
    }

    private GradientDrawable background(int color, int radius, int border) {
        GradientDrawable d = new GradientDrawable();
        d.setColor(color);
        d.setCornerRadius(dp(radius));
        if (border != Color.TRANSPARENT) d.setStroke(dp(1), border);
        return d;
    }

    private TextView text(String value, int size, int color, boolean bold) {
        TextView view = new TextView(this);
        view.setText(value);
        view.setTextSize(size);
        view.setTextColor(color);
        if (bold) view.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        view.setGravity(Gravity.CENTER_VERTICAL);
        return view;
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(BG);
        getWindow().setNavigationBarColor(BG);
        buildLayout();
        configureWebView();
        if (savedInstanceState != null && webView.restoreState(savedInstanceState) != null) {
            return;
        }
        webView.loadUrl(GAME_URL);
    }

    private void buildLayout() {
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(BG);
        root.setFitsSystemWindows(true);

        LinearLayout bar = new LinearLayout(this);
        bar.setOrientation(LinearLayout.HORIZONTAL);
        bar.setGravity(Gravity.CENTER_VERTICAL);
        bar.setPadding(dp(14), 0, dp(10), 0);
        bar.setBackgroundColor(SURFACE);

        TextView brand = text("3·2·1  FUTBOL", 20, LIME, true);
        bar.addView(brand, new LinearLayout.LayoutParams(0, dp(49), 1f));

        TextView share = toolbarButton("PAYLAŞ");
        share.setOnClickListener(v -> shareGame());
        bar.addView(share, new LinearLayout.LayoutParams(dp(69), dp(38)));

        TextView refresh = toolbarButton("YENİLE");
        refresh.setOnClickListener(v -> reloadGame());
        bar.addView(refresh, new LinearLayout.LayoutParams(dp(69), dp(38)));

        root.addView(bar, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(49)));

        FrameLayout gameArea = new FrameLayout(this);
        webView = new WebView(this);
        webView.setBackgroundColor(BG);
        gameArea.addView(webView, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

        loading = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        loading.setIndeterminate(true);
        loading.setIndeterminateTintList(android.content.res.ColorStateList.valueOf(LIME));
        FrameLayout.LayoutParams loadingParams = new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, dp(3), Gravity.TOP);
        gameArea.addView(loading, loadingParams);

        errorPanel = new LinearLayout(this);
        errorPanel.setOrientation(LinearLayout.VERTICAL);
        errorPanel.setGravity(Gravity.CENTER);
        errorPanel.setPadding(dp(28), dp(22), dp(28), dp(22));
        errorPanel.setBackgroundColor(BG);

        TextView ball = text("⚽", 52, WHITE, true);
        ball.setGravity(Gravity.CENTER);
        errorPanel.addView(ball, new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, dp(76)));

        TextView title = text("BAĞLANTI KURULAMADI", 24, LIME, true);
        title.setGravity(Gravity.CENTER);
        errorPanel.addView(title, new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, dp(53)));

        TextView subtitle = text("İnternet bağlantını kontrol edip tekrar dene. Oyun sunucusu açılmak için biraz zaman isteyebilir.", 14, MUTED, false);
        subtitle.setGravity(Gravity.CENTER);
        errorPanel.addView(subtitle, new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, dp(75)));

        Button retry = new Button(this);
        retry.setText("TEKRAR DENE");
        retry.setTextColor(BG);
        retry.setAllCaps(false);
        retry.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        retry.setBackground(background(LIME, 12, Color.TRANSPARENT));
        retry.setOnClickListener(v -> reloadGame());
        LinearLayout.LayoutParams retryParams = new LinearLayout.LayoutParams(dp(190), dp(50));
        retryParams.topMargin = dp(16);
        errorPanel.addView(retry, retryParams);

        errorPanel.setVisibility(View.GONE);
        gameArea.addView(errorPanel, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

        root.addView(gameArea, new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f));
        setContentView(root);
    }

    private TextView toolbarButton(String label) {
        TextView button = text(label, 11, WHITE, true);
        button.setGravity(Gravity.CENTER);
        button.setBackground(background(SURFACE, 9, Color.rgb(54, 98, 83)));
        button.setClickable(true);
        button.setFocusable(true);
        return button;
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void configureWebView() {
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        CookieManager.getInstance().setAcceptCookie(true);

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (isGameUrl(uri)) return false;
                if (request.isForMainFrame() && "https".equalsIgnoreCase(uri.getScheme())) {
                    try {
                        startActivity(new Intent(Intent.ACTION_VIEW, uri));
                    } catch (ActivityNotFoundException ignored) {
                        // Remain inside the game if no app can handle the URL.
                    }
                }
                return true;
            }

            @Override
            public void onPageStarted(WebView view, String url, android.graphics.Bitmap favicon) {
                loading.setVisibility(View.VISIBLE);
                errorPanel.setVisibility(View.GONE);
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                loading.setVisibility(View.GONE);
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) {
                    loading.setVisibility(View.GONE);
                    errorPanel.setVisibility(View.VISIBLE);
                }
            }

            @Override
            public void onReceivedHttpError(WebView view, WebResourceRequest request,
                                            android.webkit.WebResourceResponse response) {
                if (request.isForMainFrame() && response.getStatusCode() >= 500) {
                    loading.setVisibility(View.GONE);
                    errorPanel.setVisibility(View.VISIBLE);
                }
            }
        });
        webView.setWebChromeClient(new WebChromeClient());
    }

    private boolean isGameUrl(Uri uri) {
        return "https".equalsIgnoreCase(uri.getScheme())
                && HOST.equalsIgnoreCase(uri.getHost());
    }

    private void reloadGame() {
        errorPanel.setVisibility(View.GONE);
        if (webView != null) webView.reload();
    }

    private void shareGame() {
        Intent intent = new Intent(Intent.ACTION_SEND);
        intent.setType("text/plain");
        intent.putExtra(Intent.EXTRA_SUBJECT, "3-2-1 Futbol Oyunları");
        intent.putExtra(Intent.EXTRA_TEXT, "3-2-1 Futbol Düellosu: https://" + HOST + "/");
        startActivity(Intent.createChooser(intent, "Oyunu paylaş"));
    }

    @Override
    public void onBackPressed() {
        if (webView == null) {
            super.onBackPressed();
            return;
        }
        // Keep the web game's own themed leave-room confirmation.
        webView.evaluateJavascript(
                "(function(){try{if(document.body.classList.contains('is-playing')){" +
                "var b=document.getElementById('backLobby');if(b){b.click();return true;}}}" +
                "catch(e){}return false;})()",
                result -> {
                    if ("true".equals(result)) return;
                    new AlertDialog.Builder(this)
                            .setTitle("3-2-1 Futbol")
                            .setMessage("Oyundan çıkmak istiyor musun?")
                            .setNegativeButton("OYUNA DÖN", (dialog, which) -> dialog.dismiss())
                            .setPositiveButton("ÇIKIŞ", (dialog, which) -> finish())
                            .show();
                });
    }

    @Override
    protected void onSaveInstanceState(Bundle state) {
        if (webView != null) webView.saveState(state);
        super.onSaveInstanceState(state);
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.stopLoading();
            webView.setWebChromeClient(null);
            webView.setWebViewClient(null);
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }
}
