import { useEffect, useRef } from "react";
import { useAuth } from "../lib/auth";
import { fetchAds, injectAdCode } from "./AdSlot";

/**
 * Renders global ad scripts (popunder) that apply to all pages.
 * Injected once and persists across navigation.
 * Social Bar removed — creates intrusive push notification popups.
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

      // Only popunder — Social Bar disabled (causes intrusive push notifications)
      const slots = ["popunder-global"];
      const codes = slots.map((s) => ads[s]).filter(Boolean);
      if (codes.length === 0) return;

      injectedRef.current = true;
      codes.forEach((code) => {
        const wrapper = document.createElement("div");
        container.appendChild(wrapper);
        injectAdCode(wrapper, code);
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
