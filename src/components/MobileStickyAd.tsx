import { useEffect, useRef, useState } from "react";
import { useAuth } from "../lib/auth";
import { getAds, injectAdCode } from "../lib/ads";

export default function MobileStickyAd() {
  const { isAdFree } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [adCode, setAdCode] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (isAdFree || dismissed) return;
    let active = true;
    getAds().then((ads) => {
      if (active) { setAdCode(ads["sticky-mobile"] || null); setLoaded(true); }
    });
    return () => { active = false; };
  }, [isAdFree, dismissed]);

  useEffect(() => {
    if (isAdFree || dismissed || !loaded || !adCode || !containerRef.current) return;
    const container = containerRef.current;
    container.innerHTML = "";
    cleanupRef.current = injectAdCode(container, adCode);
    return () => {
      if (cleanupRef.current) cleanupRef.current();
      cleanupRef.current = null;
      container.innerHTML = "";
    };
  }, [adCode, loaded, isAdFree, dismissed]);

  if (isAdFree || dismissed || (loaded && !adCode)) return null;

  return (
    <div
      className="fixed left-0 right-0 z-40 md:hidden flex flex-col items-center"
      style={{ bottom: "3.5rem", paddingBottom: "0px" }}
    >
      <div className="relative bg-[#0e0e16]/95 backdrop-blur-sm border-t border-b border-white/[0.06] w-full flex justify-center py-1">
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
