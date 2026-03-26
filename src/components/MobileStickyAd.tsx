import { useEffect, useRef, useState } from "react";
import { useAuth } from "../lib/auth";

const AD_KEY = "0765c0653cd6aee612fcada9c290485e";
const INVOKE_DOMAIN = "www.highperformancegate.com";

/**
 * Sticky bottom banner 320x50 — khusus mobile.
 * Bisa ditutup, tidak menghalangi navigasi.
 */
export default function MobileStickyAd() {
  const { isAdFree } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const injectedRef = useRef(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (isAdFree || dismissed || injectedRef.current || !containerRef.current) return;
    injectedRef.current = true;

    const container = containerRef.current;

    const inline = document.createElement("script");
    inline.textContent = `atOptions = { 'key': '${AD_KEY}', 'format': 'iframe', 'height': 50, 'width': 320, 'params': {} };`;
    container.appendChild(inline);

    const external = document.createElement("script");
    external.src = `https://${INVOKE_DOMAIN}/${AD_KEY}/invoke.js`;
    container.appendChild(external);

    return () => {
      container.innerHTML = "";
      injectedRef.current = false;
    };
  }, [isAdFree, dismissed]);

  if (isAdFree || dismissed) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden flex flex-col items-center"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="relative bg-[#0e0e16]/95 backdrop-blur-sm border-t border-white/[0.06] w-full flex justify-center py-1">
        <button
          onClick={() => setDismissed(true)}
          className="absolute -top-6 right-2 z-50 w-6 h-6 rounded-full bg-black/80 border border-white/20 flex items-center justify-center text-white/80 hover:text-white hover:bg-red-600 transition-all shadow-lg"
          title="Tutup iklan"
          aria-label="Tutup iklan"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
        <div ref={containerRef} className="overflow-hidden" style={{ maxWidth: 320, maxHeight: 50 }} />
      </div>
    </div>
  );
}
