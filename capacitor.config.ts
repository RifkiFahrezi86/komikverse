import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.komikverse.app',
  appName: 'KomikVerse',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    url: 'https://komikverse-swart.vercel.app',
    // Allow ALL domains so ad iframes can load from any CDN/redirect domain.
    // Adsterra ads redirect through many domains — whitelisting them all is impractical.
    allowNavigation: ['*']
  },
  android: {
    backgroundColor: '#0d0d14',
    allowMixedContent: true,
    webContentsDebuggingEnabled: false
    // UA modification is done in MainActivity.java (dynamic strip, not static override)
  }
};

export default config;
