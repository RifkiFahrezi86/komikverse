import { useEffect, useRef } from "react";
import { useAuth } from "../lib/auth";
import { useLocation } from "react-router-dom";
import { getAds } from "../lib/ads";

const SESSION_KEY = "kv_popunder_shown";
const DELAY_MS = 30000;

export default function PopunderAd() {
  const { isAdFree } = useAuth();
  const injectedRef = useRef(false);
  const location = useLocation();

  useEffect(() => {
    if (isAdFree || injectedRef.current) return;
    if (sessionStorage.getItem(SESSION_KEY)) return;
    if (location.pathname.startsWith("/baca/")) return;

    const timer = setTimeout(async () => {
      if (injectedRef.current) return;
      const ads = await getAds();
      const code = ads["popup-global"];
      if (!code) return;

      injectedRef.current = true;
      sessionStorage.setItem(SESSION_KEY, "1");

      // Parse and inject the ad code
      const temp = document.createElement("div");
      temp.innerHTML = code;
      while (temp.firstChild) {
        const node = temp.firstChild;
        temp.removeChild(node);
        if (node instanceof HTMLScriptElement) {
          const ns = document.createElement("script");
          for (const a of Array.from(node.attributes)) ns.setAttribute(a.name, a.value);
          if (node.textContent && !node.src) ns.textContent = node.textContent;
          document.body.appendChild(ns);
        } else {
          document.body.appendChild(node);
        }
      }
    }, DELAY_MS);

    return () => clearTimeout(timer);
  }, [isAdFree, location.pathname]);

  return null;
}
