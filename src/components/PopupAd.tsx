import { useEffect, useRef } from "react";
import { useAuth } from "../lib/auth";
import { useLocation } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_BASE || atob("aHR0cHM6Ly9rb21pa3ZlcnNlLWFwaS1hbWJlci52ZXJjZWwuYXBwL2FwaQ==");
const SESSION_KEY = "kv_popunder_shown";
const DELAY_MS = 30000;

/**
 * Popunder ad — muncul 1x per sesi, delay 30 detik, tidak saat membaca komik.
 * Mengambil ad_code dari slot "popup-global" di database.
 */
export default function PopunderAd() {
  const { isAdFree } = useAuth();
  const injectedRef = useRef(false);
  const location = useLocation();

  useEffect(() => {
    if (isAdFree || injectedRef.current) return;
    if (sessionStorage.getItem(SESSION_KEY)) return;
    if (location.pathname.startsWith("/baca/")) return;

    const timer = setTimeout(() => {
      if (injectedRef.current) return;

      fetch(`${API_BASE}/ads`)
        .then((r) => r.json())
        .then((d) => {
          const ads = d.ads || {};
          const code = ads["popup-global"] || "";
          if (!code || injectedRef.current) return;

          injectedRef.current = true;
          sessionStorage.setItem(SESSION_KEY, "1");

          const temp = document.createElement("div");
          temp.innerHTML = code;
          const scripts = temp.querySelectorAll("script");

          scripts.forEach((origScript) => {
            const script = document.createElement("script");
            if (origScript.src) {
              script.src = origScript.src;
              script.async = true;
            } else {
              script.textContent = origScript.textContent;
            }
            document.body.appendChild(script);
          });
        })
        .catch(() => {});
    }, DELAY_MS);

    return () => clearTimeout(timer);
  }, [isAdFree, location.pathname]);

  return null;
}
