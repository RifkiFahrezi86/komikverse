import { useEffect, useState, useRef } from "react";
import { useAuth } from "../lib/auth";

const API_BASE = import.meta.env.VITE_API_BASE || atob("aHR0cHM6Ly9rb21pa3ZlcnNlLWFwaS1hbWJlci52ZXJjZWwuYXBwL2FwaQ==");
const ADS_URL = API_BASE.replace(/\/api\/?$/, "/api/ads");

// Cache ads globally so we don't refetch on every component mount
let adsCache: Record<string, string> | null = null;
let adsFetchPromise: Promise<Record<string, string>> | null = null;

async function fetchAds(): Promise<Record<string, string>> {
  if (adsCache) return adsCache;
  if (adsFetchPromise) return adsFetchPromise;
  adsFetchPromise = fetch(ADS_URL)
    .then((r) => r.json())
    .then((d) => {
      adsCache = d.ads || d.data || {};
      return adsCache!;
    })
    .catch(() => {
      adsCache = {};
      return {};
    });
  return adsFetchPromise;
}

// Invalidate cache periodically (5 minutes)
setInterval(() => { adsCache = null; adsFetchPromise = null; }, 5 * 60 * 1000);

// Export for GlobalAds and PopupAd to use
export { fetchAds };

/**
 * Safely inject ad HTML into a container element.
 * Uses an iframe sandbox so ad scripts that rely on document.write
 * or document.currentScript work correctly (common with Adsterra).
 */
export function injectAdCode(container: HTMLElement, code: string) {
  container.innerHTML = "";

  const iframe = document.createElement("iframe");
  iframe.style.cssText = "width:100%;border:none;overflow:hidden;display:block;background:transparent;";
  iframe.setAttribute("scrolling", "no");
  iframe.setAttribute("frameborder", "0");
  container.appendChild(iframe);

  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) return;

  doc.open();
  doc.write(`<!DOCTYPE html><html><head><style>body{margin:0;display:flex;justify-content:center;align-items:center;background:transparent;overflow:hidden;}</style></head><body>${code}</body></html>`);
  doc.close();

  // Auto-resize iframe to fit ad content
  const resize = () => {
    try {
      const h = doc.documentElement?.scrollHeight || doc.body?.scrollHeight || 0;
      if (h > 0) iframe.style.height = h + "px";
    } catch { /* cross-origin */ }
  };
  resize();
  // Check a few times as ads may load async
  const t1 = setTimeout(resize, 1000);
  const t2 = setTimeout(resize, 3000);
  const t3 = setTimeout(resize, 5000);

  // Cleanup on unmount would be handled by React removing the container
  iframe.dataset.timers = [t1, t2, t3].join(",");
}

/**
 * Inject global scripts (popunder, social bar) directly into document.
 * These don't render visible content in a container — they attach
 * to the page (e.g. click handlers, floating bars).
 */
export function injectGlobalScript(code: string) {
  const temp = document.createElement("div");
  temp.innerHTML = code;

  while (temp.firstChild) {
    const node = temp.firstChild;
    if (node.nodeType === 1 && (node as Element).tagName === "SCRIPT") {
      const old = node as HTMLScriptElement;
      temp.removeChild(old);
      const s = document.createElement("script");
      Array.from(old.attributes).forEach((a) => s.setAttribute(a.name, a.value));
      if (old.textContent) s.textContent = old.textContent;
      document.body.appendChild(s);
    } else {
      document.body.appendChild(node);
    }
  }
}

export default function AdSlot({ name, className = "" }: { name: string; className?: string }) {
  const { isAdFree } = useAuth();
  const [code, setCode] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const injectedRef = useRef(false);

  useEffect(() => {
    if (isAdFree) return;
    fetchAds().then((ads) => {
      if (ads[name]) setCode(ads[name]);
    });
  }, [name, isAdFree]);

  // Inject ad code and execute scripts properly
  useEffect(() => {
    if (!code || !containerRef.current || injectedRef.current) return;
    injectedRef.current = true;
    injectAdCode(containerRef.current, code);
  }, [code]);

  if (isAdFree || !code) return null;

  return <div ref={containerRef} className={`ad-slot overflow-hidden ${className}`} />;
}
