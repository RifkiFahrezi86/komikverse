import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.komikverse.app',
  appName: 'KomikVerse',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    url: 'https://komikverse-swart.vercel.app',
    allowNavigation: ['komikverse-swart.vercel.app', 'komikverse-api-amber.vercel.app']
  },
  android: {
    backgroundColor: '#0d0d14',
    allowMixedContent: true
  }
};

export default config;
