package com.komikverse.app;

import android.os.Bundle;
import android.view.View;
import android.webkit.CookieManager;
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

        // Immersive sticky mode
        getWindow().getDecorView().setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
            | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
            | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
        );

        // Configure WebView for ad compatibility after bridge is initialized
        getBridge().getWebView().post(() -> {
            try {
                WebView webView = getBridge().getWebView();
                WebSettings settings = webView.getSettings();

                // 1. Strip WebView identifiers from User-Agent
                //    "...; wv) ... Version/4.0 Chrome/..." → "...) ... Chrome/..."
                //    Dynamic modification preserves device-specific Chrome version
                String ua = settings.getUserAgentString();
                if (ua != null) {
                    ua = ua.replace("; wv", "");
                    ua = ua.replaceAll("Version/\\d+\\.\\d+\\s?", "");
                    settings.setUserAgentString(ua);
                }

                // 2. Enable third-party cookies (required for ad tracking/targeting)
                CookieManager cookieManager = CookieManager.getInstance();
                cookieManager.setAcceptThirdPartyCookies(webView, true);

                // 3. Ensure JS and DOM storage are on (Capacitor sets them,
                //    but re-affirm for ad script compatibility)
                settings.setJavaScriptEnabled(true);
                settings.setDomStorageEnabled(true);

                // 4. Allow mixed content (HTTP resources inside HTTPS page)
                settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);

                // 5. Disable multiple windows — prevent ads from spawning new windows
                settings.setSupportMultipleWindows(false);
                settings.setJavaScriptCanOpenWindowsAutomatically(false);

                // 6. Remove X-Requested-With header (WebView fingerprint used by ad networks)
                //    Uses reflection — available on modern WebView (Chrome 105+)
                try {
                    settings.getClass().getMethod("setRequestedWithHeaderMode", int.class)
                        .invoke(settings, 0); // 0 = REQUESTED_WITH_HEADER_MODE_NO_HEADER
                } catch (Exception ignored) {}

            } catch (Exception ignored) {}
        });
    }
}
