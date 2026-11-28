package com.gasagency.app;

import android.os.Bundle;
import android.view.WindowManager;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Let the WebView draw edge-to-edge behind the status bar.
        // We pass the actual inset values to CSS as custom properties instead
        // of adding Java-side view padding (which would double-count the inset).
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);

        ViewCompat.setOnApplyWindowInsetsListener(findViewById(android.R.id.content), (view, insets) -> {
            int topPx   = insets.getInsets(WindowInsetsCompat.Type.systemBars()).top;
            int bottomPx = insets.getInsets(WindowInsetsCompat.Type.systemBars()).bottom;
            float density = getResources().getDisplayMetrics().density;
            // Convert px -> dp for CSS (CSS px == dp on Android)
            float topDp    = topPx    / density;
            float bottomDp = bottomPx / density;

            // Inject real inset values into the WebView as CSS variables
            // so our app-header and bottom-nav use them instead of env()
            String js = String.format(
                "document.documentElement.style.setProperty('--safe-area-top','%.1fpx');" +
                "document.documentElement.style.setProperty('--safe-area-bottom','%.1fpx');",
                topDp, bottomDp
            );
            getBridge().getWebView().post(() -> getBridge().getWebView().evaluateJavascript(js, null));

            // Do NOT add view.setPadding() – CSS handles the offset
            return insets;
        });
    }
}
