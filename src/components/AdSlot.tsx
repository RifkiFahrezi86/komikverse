import { useEffect, useRef, useState } from "react";
import { useAuth } from "../lib/auth";

// ─── Hardcoded Ad Configuration (Adsterra) ────────────────
const BANNER_ADS = {
  "728x90": { key: "5c01a1d15d1a70394faba93bab910d76", width: 728, height: 90 },
  "300x250": { key: "6b4a8f2d650a7e5ad65b05a797c81b41", width: 300, height: 250 },
  "468x60": { key: "14a131e28a7f22c03914636316840b63", width: 468, height: 60 },
  "320x50": { key: "0765c0653cd6aee612fcada9c290485e", width: 320, height: 50 },
} as const;

const NATIVE_AD = {
  scriptSrc: "https://pl28923740.profitablecpmratenetwork.com/63f5f4604f3de09027f2c24273fe2d2f/invoke.js",
  containerId: "container-63f5f4604f3de09027f2c24273fe2d2f",
};

const INVOKE_DOMAIN = "www.highperformancegate.com";
const AD_TIMEOUT = 6000; // auto-hide if no ad after 6s

// Unique counter for container IDs
let adIdCounter = 0;

// ─── Banner Loading: async container approach ─────────────
function loadBanner(
  container: HTMLElement,
  key: string,
  width: number,
  height: number,
  onEmpty: () => void,
): () => void {
  let cancelled = false;
  const elements: HTMLElement[] = [];

  // Create a named container div so invoke.js knows where to inject
  const containerId = `atContainer-${key}-${++adIdCounter}`;
  const adDiv = document.createElement("div");
  adDiv.id = containerId;
  container.appendChild(adDiv);
  elements.push(adDiv);

  // Init global async structures
  const w = window as any;
  if (!w.atAsyncContainers || typeof w.atAsyncContainers !== "object") w.atAsyncContainers = {};
  if (!Array.isArray(w.atAsyncOptions)) w.atAsyncOptions = [];

  // Push options BEFORE loading invoke.js
  w.atAsyncOptions.push({
    key,
    format: "iframe",
    height,
    width,
    params: {},
    container: containerId,
    async: true,
  });

  const script = document.createElement("script");
  script.src = `https://${INVOKE_DOMAIN}/${key}/invoke.js`;
  script.async = true;
  script.onerror = () => { if (!cancelled) onEmpty(); };
  container.appendChild(script);
  elements.push(script);

  // Auto-hide after timeout if no visible ad content
  const timer = setTimeout(() => {
    if (cancelled) return;
    const hasIframe = container.querySelector("iframe") !== null;
    const hasImg = container.querySelector("img") !== null;
    if (!hasIframe && !hasImg) onEmpty();
  }, AD_TIMEOUT);

  return () => {
    cancelled = true;
    clearTimeout(timer);
    elements.forEach((el) => el.remove());
  };
}

// Track native banner usage (only 1 allowed globally)
let nativeBannerActive = false;

function loadNativeBanner(container: HTMLElement, onEmpty: () => void): () => void {
  if (nativeBannerActive) { onEmpty(); return () => {}; }
  nativeBannerActive = true;

  const div = document.createElement("div");
  div.id = NATIVE_AD.containerId;
  container.appendChild(div);

  const script = document.createElement("script");
  script.async = true;
  script.setAttribute("data-cfasync", "false");
  script.src = NATIVE_AD.scriptSrc;
  script.onerror = () => onEmpty();
  container.appendChild(script);

  const timer = setTimeout(() => {
    if (div.children.length === 0) onEmpty();
  }, AD_TIMEOUT);

  return () => {
    clearTimeout(timer);
    script.remove();
    div.remove();
    nativeBannerActive = false;
  };
}

// ─── AdSlot Component ─────────────────────────────────────
export type BannerSize = keyof typeof BANNER_ADS;

interface AdSlotProps {
  type: BannerSize | "native";
  className?: string;
}

export default function AdSlot({ type, className = "" }: AdSlotProps) {
  const { isAdFree } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [empty, setEmpty] = useState(false);

  useEffect(() => {
    if (isAdFree || dismissed || !containerRef.current) return;
    let mounted = true;
    const container = containerRef.current;
    container.innerHTML = "";
    setEmpty(false);

    const markEmpty = () => { if (mounted) setEmpty(true); };

    if (type === "native") {
      cleanupRef.current = loadNativeBanner(container, markEmpty);
    } else {
      const ad = BANNER_ADS[type];
      cleanupRef.current = loadBanner(container, ad.key, ad.width, ad.height, markEmpty);
    }

    return () => {
      mounted = false;
      if (cleanupRef.current) cleanupRef.current();
      cleanupRef.current = null;
    };
  }, [type, isAdFree, dismissed]);

  if (isAdFree || dismissed || empty) return null;

  const ad = type !== "native" ? BANNER_ADS[type] : null;

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
        style={ad ? { maxWidth: "100%" } : undefined}
      />
    </div>
  );
}
