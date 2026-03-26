import { useEffect, useRef } from "react";
import { useAuth } from "../lib/auth";
import { useLocation } from "react-router-dom";

const isCapacitor = typeof (window as any).Capacitor !== "undefined" || /wv|WebView/i.test(navigator.userAgent);

const POPUNDER_SRC = "https://pl28923689.profitablecpmratenetwork.com/5a/5e/18/5a5e18adc44d72973fdb14f945055f50.js";
const SESSION_KEY = "kv_popunder_shown";
const DELAY_MS = 30000; // 30 detik setelah halaman dimuat

/**
 * Popunder ad — muncul 1x per sesi, delay 30 detik, tidak saat membaca komik.
 * Tidak merender apapun ke layar (script-only).
 */
export default function PopunderAd() {
  const { isAdFree } = useAuth();
  const injectedRef = useRef(false);
  const location = useLocation();

  useEffect(() => {
    if (isAdFree || injectedRef.current || isCapacitor) return;
    if (sessionStorage.getItem(SESSION_KEY)) return;

    // Jangan tampilkan saat membaca komik
    if (location.pathname.startsWith("/baca/")) return;

    const timer = setTimeout(() => {
      if (injectedRef.current) return;
      injectedRef.current = true;
      sessionStorage.setItem(SESSION_KEY, "1");

      const script = document.createElement("script");
      script.src = POPUNDER_SRC;
      script.async = true;
      document.body.appendChild(script);
    }, DELAY_MS);

    return () => clearTimeout(timer);
  }, [isAdFree, location.pathname]);

  return null;
}
