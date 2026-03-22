import { useEffect, useRef } from "react";
import { useAuth } from "../lib/auth";

/**
 * Injects Popunder script on mount (HomePage only).
 * Script-only ad — no visible container needed.
 * Renders nothing visible.
 */
export default function HomeScriptAds() {
  const { isAdFree } = useAuth();
  const injectedRef = useRef(false);

  useEffect(() => {
    if (isAdFree || injectedRef.current) return;
    injectedRef.current = true;

    // Popunder (28823190)
    const popunder = document.createElement("script");
    popunder.src = "https://pl28923689.profitablecpmratenetwork.com/5a/5e/18/5a5e18adc44d72973fdb14f945055f50.js";
    popunder.async = true;
    document.body.appendChild(popunder);

    return () => {
      popunder.remove();
    };
  }, [isAdFree]);

  return null;
}
