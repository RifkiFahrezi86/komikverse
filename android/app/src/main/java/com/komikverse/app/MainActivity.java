package com.komikverse.app;

import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Edge-to-edge display
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);

        // Transparent system bars
        getWindow().setStatusBarColor(android.graphics.Color.TRANSPARENT);
        getWindow().setNavigationBarColor(android.graphics.Color.TRANSPARENT);

        // Immersive sticky mode - nav buttons auto-hide, swipe to show temporarily
        getWindow().getDecorView().setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
            | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
            | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
        );

        // Remove WebView markers from User-Agent so ad networks
        // treat this as a regular Chrome mobile browser instead of blocking ads.
        // WebView UA: "...(Android 14; ... Build/...; wv) ... Version/4.0 Chrome/..."
        // After fix: "...(Android 14; ... Build/...) ... Chrome/..." (same as Chrome)
        try {
            WebView webView = getBridge().getWebView();
            if (webView != null) {
                WebSettings settings = webView.getSettings();
                String ua = settings.getUserAgentString();
                ua = ua.replace("; wv", "");
                ua = ua.replace("Version/4.0 ", "");
                settings.setUserAgentString(ua);
            }
        } catch (Exception ignored) {}
    }
}
