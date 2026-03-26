import { useEffect, useRef, useState } from "react";
import { useAuth } from "../lib/auth";

const API_BASE = import.meta.env.VITE_API_BASE || atob("aHR0cHM6Ly9rb21pa3ZlcnNlLWFwaS1hbWJlci52ZXJjZWwuYXBwL2FwaQ==");

// ─── Ad Cache ─────────────────────────────────────────────
// Fetched once from API, cached in memory for the session
let adCache: Record<string, string> | null = null;
let adCachePromise: Promise<Record<string, string>> | null = null;

function fetchAds(): Promise<Record<string, string>> {
  if (adCache) return Promise.resolve(adCache);
  if (adCachePromise) return adCachePromise;
  adCachePromise = fetch(`${API_BASE}/ads`)
    .then((r) => r.json())
    .then((d) => {
      adCache = d.ads || {};
      return adCache!;
    })
    .catch(() => {
      adCache = {};
      return adCache!;
    })
    .finally(() => { adCachePromise = null; });
  return adCachePromise;
}

// Force refresh from API (called after admin updates)
export function invalidateAdCache() {
  adCache = null;
  adCachePromise = null;
}

// ─── AdSlot Component ─────────────────────────────────────
interface AdSlotProps {
  slot: string;
  className?: string;
}

export default function AdSlot({ slot, className = "" }: AdSlotProps) {
  const { isAdFree } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const [dismissed, setDismissed] = useState(false);
  const [adCode, setAdCode] = useState<string | null>(null);

  useEffect(() => {
    if (isAdFree || dismissed) return;
    let cancelled = false;
    fetchAds().then((ads) => {
      if (!cancelled) setAdCode(ads[slot] || "");
    });
    return () => { cancelled = true; };
  }, [slot, isAdFree, dismissed]);

  useEffect(() => {
    if (!adCode || !containerRef.current) return;
    const container = containerRef.current;
    container.innerHTML = "";

    // Parse ad code and inject scripts properly
    const temp = document.createElement("div");
    temp.innerHTML = adCode;

    // Extract and execute scripts
    const scripts = temp.querySelectorAll("script");
    const nonScriptContent = adCode.replace(/<script[\s\S]*?<\/script>/gi, "");

    if (nonScriptContent.trim()) {
      const wrapper = document.createElement("div");
      wrapper.innerHTML = nonScriptContent;
      container.appendChild(wrapper);
    }

    scripts.forEach((origScript) => {
      const script = document.createElement("script");
      if (origScript.src) {
        script.src = origScript.src;
        script.async = true;
      } else {
        script.textContent = origScript.textContent;
      }
      // Copy attributes
      Array.from(origScript.attributes).forEach((attr) => {
        if (attr.name !== "src") script.setAttribute(attr.name, attr.value);
      });
      container.appendChild(script);
    });

    return () => { container.innerHTML = ""; };
  }, [adCode]);

  if (isAdFree || dismissed) return null;
  // Don't render if no ad code loaded yet or empty
  if (adCode === null) return null;
  if (adCode === "") return null;

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
        style={{ minHeight: 50 }}
      />
    </div>
  );
}
