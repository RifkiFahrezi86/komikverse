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
 * Inserts non-script nodes first (divs, containers), then creates
 * script elements in order so they actually execute.
 */
export function injectAdCode(container: HTMLElement, code: string) {
  container.innerHTML = "";
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
      container.appendChild(s);
    } else {
      container.appendChild(node);
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
