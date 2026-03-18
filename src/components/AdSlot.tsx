import { useEffect, useState, useRef } from "react";
import { useAuth } from "../lib/auth";

const API_BASE = import.meta.env.VITE_API_BASE || atob("aHR0cHM6Ly9rb21pa3ZlcnNlLWFwaS1hbWJlci52ZXJjZWwuYXBwL2FwaQ==");
const ADS_URL = API_BASE.replace(/\/api\/?$/, "/api/ads");

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

setInterval(() => { adsCache = null; adsFetchPromise = null; }, 5 * 60 * 1000);

export { fetchAds };

/**
 * Parse ad HTML string and inject into container.
 * 1. Insert all non-script nodes (div containers etc.) first
 * 2. Then execute scripts one by one in order:
 *    - Inline scripts: eval immediately (e.g. atOptions = {...})
 *    - External scripts: load via dynamic <script> element, wait for onload
 * This ensures Adsterra's atOptions is set BEFORE invoke.js runs.
 */
export function injectAdCode(container: HTMLElement, code: string): () => void {
  container.innerHTML = "";
  const parser = new DOMParser();
  const doc = parser.parseFromString(code, "text/html");

  // Collect scripts in order, insert non-script nodes first
  const scripts: HTMLScriptElement[] = [];
  const allNodes = doc.body.childNodes;

  for (let i = 0; i < allNodes.length; i++) {
    const node = allNodes[i];
    if (node.nodeType === 1 && (node as Element).tagName === "SCRIPT") {
      scripts.push(node as HTMLScriptElement);
    } else {
      container.appendChild(document.importNode(node, true));
    }
  }

  // Track created script elements for cleanup
  const createdScripts: HTMLScriptElement[] = [];
  let cancelled = false;

  // Execute scripts sequentially
  function runNext(index: number) {
    if (cancelled || index >= scripts.length) return;
    const old = scripts[index];
    const el = document.createElement("script");

    // Copy attributes
    Array.from(old.attributes).forEach((a) => el.setAttribute(a.name, a.value));

    if (old.src) {
      // External script — wait for load before running next
      el.onload = () => runNext(index + 1);
      el.onerror = () => runNext(index + 1);
      container.appendChild(el);
    } else {
      // Inline script — execute immediately
      el.textContent = old.textContent;
      container.appendChild(el);
      runNext(index + 1);
    }
    createdScripts.push(el);
  }

  runNext(0);

  // Return cleanup function
  return () => {
    cancelled = true;
    createdScripts.forEach((s) => s.remove());
  };
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

  useEffect(() => {
    if (!code || !containerRef.current || injectedRef.current) return;
    injectedRef.current = true;
    const cleanup = injectAdCode(containerRef.current, code);
    return cleanup;
  }, [code]);

  if (isAdFree || !code) return null;

  return <div ref={containerRef} className={`ad-slot overflow-hidden ${className}`} />;
}
