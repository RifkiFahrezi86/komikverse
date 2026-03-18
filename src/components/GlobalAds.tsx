import { useEffect, useRef } from "react";
import { useAuth } from "../lib/auth";
import { fetchAds, injectGlobalScript } from "./AdSlot";

/**
 * Renders global ad scripts (popunder, social bar) that apply to all pages.
 * These are injected once and persist across navigation.
 * Hidden for ad-free users (logged-in users with ad_free=true, or admins).
 */
export default function GlobalAds() {
  const { isAdFree, loading } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const injectedRef = useRef(false);

  useEffect(() => {
    if (loading || isAdFree || injectedRef.current) return;

    fetchAds().then((ads) => {
      const container = containerRef.current;
      if (!container) return;

      const slots = ["popunder-global", "socialbar-global"];
      const codes = slots.map((s) => ads[s]).filter(Boolean);
      if (codes.length === 0) return;

      injectedRef.current = true;
      codes.forEach((code) => {
        injectGlobalScript(code);
      });
    });

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
        injectedRef.current = false;
      }
    };
  }, [isAdFree, loading]);

  if (isAdFree) return null;

  return <div ref={containerRef} className="global-ads" style={{ display: "contents" }} />;
}
