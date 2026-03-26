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
    webContentsDebuggingEnabled: false
  }
};

export default config;
