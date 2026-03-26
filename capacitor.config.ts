import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.komikverse.app',
  appName: 'KomikVerse',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    url: 'https://komikverse-swart.vercel.app',
    allowNavigation: [
      'komikverse-swart.vercel.app',
      'komikverse-api-amber.vercel.app',
      '*.highperformanceformat.com',
      '*.profitablecpmratenetwork.com',
      '*.adsterra.com',
      '*.adstera.com',
    ]
  },
  android: {
    backgroundColor: '#0d0d14',
    allowMixedContent: true,
    webContentsDebuggingEnabled: false,
    // Override UA to look like regular Chrome — removes "; wv" and "Version/4.0" WebView markers.
    // Without this, ad networks (Adsterra etc.) detect WebView and refuse to serve ads.
    overrideUserAgent: 'Mozilla/5.0 (Linux; Android 14; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.6778.39 Mobile Safari/537.36'
  }
};

export default config;
