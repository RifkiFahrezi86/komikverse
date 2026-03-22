import { useEffect, useRef } from "react";
import { useAuth } from "../lib/auth";

/**
 * Injects Popunder and Social Bar scripts on mount (HomePage only).
 * These are script-only ads — no visible container needed.
 * Renders nothing visible.
 */
export default function HomeScriptAds() {
  const { isAdFree } = useAuth();
  const injectedRef = useRef(false);

  useEffect(() => {
    if (isAdFree || injectedRef.current) return;
    injectedRef.current = true;

    const scripts: HTMLScriptElement[] = [];

    // Popunder (28823190)
    const popunder = document.createElement("script");
    popunder.src = "https://pl28923689.profitablecpmratenetwork.com/5a/5e/18/5a5e18adc44d72973fdb14f945055f50.js";
    popunder.async = true;
    document.body.appendChild(popunder);
    scripts.push(popunder);

    // Social Bar (28823243)
    const socialBar = document.createElement("script");
    socialBar.src = "https://pl28923742.profitablecpmratenetwork.com/59/d8/3a/59d83a55bd2ffaf1f4ee7fd16ead4aa6.js";
    socialBar.async = true;
    document.body.appendChild(socialBar);
    scripts.push(socialBar);

    return () => {
      scripts.forEach((s) => s.remove());
    };
  }, [isAdFree]);

  return null;
}
