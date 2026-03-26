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

// ─── Banner Loading via Isolated Iframe ───────────────────
// Each banner runs in its own srcdoc iframe to avoid:
// - atOptions global conflicts between multiple ads
// - Script loading race conditions
// - Parent page interference with ad scripts
function loadBanner(container: HTMLElement, key: string, width: number, height: number): () => void {
  const iframe = document.createElement("iframe");
  iframe.style.width = `${width}px`;
  iframe.style.maxWidth = "100%";
  iframe.style.height = `${height}px`;
  iframe.style.border = "none";
  iframe.style.overflow = "hidden";
  iframe.scrolling = "no";
  iframe.setAttribute("frameborder", "0");

  const html = "<!DOCTYPE html><html><head>"
    + "<style>*{margin:0;padding:0;overflow:hidden}body{background:transparent}</style>"
    + "</head><body>"
    + "<script>atOptions={'key':'" + key + "','format':'iframe','height':" + height + ",'width':" + width + ",'params':{}};<" + "/script>"
    + "<script src='https://" + INVOKE_DOMAIN + "/" + key + "/invoke.js'><" + "/script>"
    + "</body></html>";

  iframe.srcdoc = html;
  container.appendChild(iframe);
  return () => { iframe.remove(); };
}

// ─── Native Banner Loading via Isolated Iframe ────────────
let nativeBannerActive = false;

function loadNativeBanner(container: HTMLElement): () => void {
  if (nativeBannerActive) return () => {};
  nativeBannerActive = true;

  const iframe = document.createElement("iframe");
  iframe.style.width = "100%";
  iframe.style.minHeight = "250px";
  iframe.style.border = "none";
  iframe.scrolling = "no";
  iframe.setAttribute("frameborder", "0");

  const html = "<!DOCTYPE html><html><head>"
    + "<style>*{margin:0;padding:0}body{background:transparent}</style>"
    + "</head><body>"
    + "<div id='" + NATIVE_AD.containerId + "'></div>"
    + "<script async data-cfasync='false' src='" + NATIVE_AD.scriptSrc + "'><" + "/script>"
    + "</body></html>";

  iframe.srcdoc = html;
  container.appendChild(iframe);

  return () => {
    iframe.remove();
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

  useEffect(() => {
    if (isAdFree || dismissed || !containerRef.current) return;
    const container = containerRef.current;
    container.innerHTML = "";

    if (type === "native") {
      cleanupRef.current = loadNativeBanner(container);
    } else {
      const ad = BANNER_ADS[type];
      cleanupRef.current = loadBanner(container, ad.key, ad.width, ad.height);
    }

    return () => {
      if (cleanupRef.current) cleanupRef.current();
      cleanupRef.current = null;
    };
  }, [type, isAdFree, dismissed]);

  if (isAdFree || dismissed) return null;

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
        style={ad ? { maxWidth: "100%", minHeight: ad.height } : { minHeight: 100 }}
      />
    </div>
  );
}
