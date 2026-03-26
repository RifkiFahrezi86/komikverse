import { useEffect, useRef, useState } from "react";
import { useAuth } from "../lib/auth";
import { getAds, injectAdCode } from "../lib/ads";

// ─── AdSlot Component ─────────────────────────────────────
interface AdSlotProps {
  slot: string;
  className?: string;
}

export default function AdSlot({ slot, className = "" }: AdSlotProps) {
  const { isAdFree } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [adCode, setAdCode] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Fetch ad code for this slot
  useEffect(() => {
    if (isAdFree || dismissed) return;
    let active = true;
    getAds().then((ads) => {
      if (active) {
        setAdCode(ads[slot] || null);
        setLoaded(true);
      }
    });
    return () => { active = false; };
  }, [slot, isAdFree, dismissed]);

  // Inject ad code into container
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

  // Don't render anything if no ad code for this slot
  if (isAdFree || dismissed || (loaded && !adCode)) return null;

  return (
    <div className={`ad-slot relative ${className}`}>
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-1 right-1 z-10 w-6 h-6 rounded-full bg-black/70 border border-white/20 flex items-center justify-center text-white/80 hover:text-white hover:bg-red-600 transition-all"
        title="Tutup iklan"
        aria-label="Tutup iklan"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
      <div
        ref={containerRef}
        className="flex items-center justify-center overflow-hidden"
        style={{ minHeight: loaded ? undefined : 90 }}
      />
    </div>
  );
}
