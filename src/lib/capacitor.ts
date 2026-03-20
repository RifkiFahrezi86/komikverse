import { Capacitor } from '@capacitor/core';

export function setupBackButton() {
  if (!Capacitor.isNativePlatform()) return;

  import('@capacitor/app').then(({ App }) => {
    App.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back();
      } else {
        App.minimizeApp();
      }
    });
  });
}
