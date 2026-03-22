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

interface ParsedPart {
  type: "html" | "script-inline" | "script-external";
  content: string; // For html: the HTML string. For inline: script body. For external: src URL.
  attrs: string; // raw attributes string for script tags
}

/**
 * Parse ad code string into parts, preserving order.
 * Splits script tags from non-script HTML so we can handle each correctly.
 */
function parseAdCode(code: string): ParsedPart[] {
  const parts: ParsedPart[] = [];
  const scriptRegex = /<script([^>]*)>([\s\S]*?)<\/script>/gi;
  let lastIndex = 0;
  let match;

  while ((match = scriptRegex.exec(code)) !== null) {
    // HTML before this script
    if (match.index > lastIndex) {
      const html = code.slice(lastIndex, match.index).trim();
      if (html) parts.push({ type: "html", content: html, attrs: "" });
    }

    const attrs = match[1].trim();
    const body = match[2].trim();
    const srcMatch = attrs.match(/src\s*=\s*["']([^"']+)["']/i);

    if (srcMatch) {
      // External script
      let src = srcMatch[1];
      // Fix protocol-relative URLs
      if (src.startsWith("//")) src = "https:" + src;
      parts.push({ type: "script-external", content: src, attrs });
    } else if (body) {
      // Inline script
      parts.push({ type: "script-inline", content: body, attrs });
    }

    lastIndex = match.index + match[0].length;
  }

  // Remaining HTML after last script
  if (lastIndex < code.length) {
    const html = code.slice(lastIndex).trim();
    if (html) parts.push({ type: "html", content: html, attrs: "" });
  }

  return parts;
}

/**
 * Anti-redirect guard.
 * Blocks ad scripts from hijacking user clicks via:
 * - window.open() calls (popup redirects)
 * - Hidden overlay divs covering the page (click-jacking)
 * - Suspicious click handlers on document.body
 */
function startAntiRedirectGuard(): () => void {
  const cleanups: (() => void)[] = [];

  // 1. Block window.open() from ad scripts
  const origOpen = window.open;
  window.open = function (...args: Parameters<typeof window.open>) {
    // Only allow if triggered by a trusted user click on an actual ad link
    // Block automated/scripted calls (the main source of redirects)
    return null;
  } as typeof window.open;
  cleanups.push(() => { window.open = origOpen; });

  // 2. MutationObserver to detect and remove hidden overlay click-jacking elements
  // Ad scripts inject invisible full-page divs that redirect on any click
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (!(node instanceof HTMLElement)) continue;
        // Skip elements inside ad containers (legitimate ad content)
        if (node.closest(".ad-slot")) continue;
        
        const style = node.style;
        const isFullOverlay =
          node.tagName === "DIV" &&
          (style.position === "fixed" || style.position === "absolute") &&
          (style.zIndex && parseInt(style.zIndex) > 900) &&
          (style.opacity === "0" || style.opacity === "" || parseFloat(style.opacity || "1") < 0.05) &&
          !node.id?.includes("container-");

        if (isFullOverlay) {
          node.remove();
          continue;
        }
        
        // Also catch invisible anchors/links injected outside ad containers
        if (node.tagName === "A" && (style.position === "fixed" || style.position === "absolute")) {
          const rect = node.getBoundingClientRect();
          if (rect.width > window.innerWidth * 0.5 || rect.height > window.innerHeight * 0.5) {
            node.remove();
          }
        }
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
  cleanups.push(() => observer.disconnect());

  // 3. Block suspicious body click handlers added by ad scripts
  const origAddEvent = document.body.addEventListener;
  document.body.addEventListener = function (
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions
  ) {
    // Block click/mousedown/touchstart handlers silently added by ad scripts
    if (type === "click" || type === "mousedown" || type === "touchstart" || type === "pointerdown") {
      return; // Swallow — don't add it
    }
    return origAddEvent.call(document.body, type, listener, options as any);
  } as typeof document.body.addEventListener;
  cleanups.push(() => { document.body.addEventListener = origAddEvent; });

  return () => { cleanups.forEach((fn) => fn()); };
}

// Global guard — activated once and stays active
let guardCleanup: (() => void) | null = null;
function ensureAntiRedirectGuard() {
  if (!guardCleanup) {
    guardCleanup = startAntiRedirectGuard();
  }
}

/**
 * Inject ad code into a container element.
 * - HTML parts are inserted via innerHTML
 * - Inline scripts are created as script elements with textContent
 * - External scripts are loaded sequentially (wait for onload before next)
 * - Anti-redirect guard blocks popups and invisible overlays from ad scripts
 */
export function injectAdCode(container: HTMLElement, code: string): () => void {
  // Activate anti-redirect protection before injecting any ad code
  ensureAntiRedirectGuard();

  container.innerHTML = "";
  const parts = parseAdCode(code);
  const created: HTMLElement[] = [];
  let cancelled = false;

  function runNext(index: number) {
    if (cancelled || index >= parts.length) return;
    const part = parts[index];

    if (part.type === "html") {
      const div = document.createElement("div");
      div.innerHTML = part.content;
      // Move children directly into container
      while (div.firstChild) {
        created.push(div.firstChild as HTMLElement);
        container.appendChild(div.firstChild);
      }
      runNext(index + 1);
    } else if (part.type === "script-inline") {
      const el = document.createElement("script");
      el.textContent = part.content;
      container.appendChild(el);
      created.push(el);
      runNext(index + 1);
    } else if (part.type === "script-external") {
      const el = document.createElement("script");
      // Copy relevant attributes (async, data-cfasync, type, etc)
      const attrStr = part.attrs;
      if (/async/i.test(attrStr)) el.async = true;
      const dataCf = attrStr.match(/data-cfasync\s*=\s*["']([^"']+)["']/i);
      if (dataCf) el.setAttribute("data-cfasync", dataCf[1]);
      const typeMatch = attrStr.match(/type\s*=\s*["']([^"']+)["']/i);
      if (typeMatch) el.type = typeMatch[1];

      el.src = part.content;
      el.onload = () => runNext(index + 1);
      el.onerror = () => runNext(index + 1);
      container.appendChild(el);
      created.push(el);
      // Don't call runNext here — wait for onload/onerror
    }
  }

  runNext(0);

  return () => {
    cancelled = true;
    created.forEach((el) => el.remove());
  };
}

export default function AdSlot({ name, className = "" }: { name: string; className?: string }) {
  const { isAdFree } = useAuth();
  const [code, setCode] = useState("");
  const [dismissed, setDismissed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const injectedRef = useRef(false);

  useEffect(() => {
    if (isAdFree) return;
    fetchAds().then((ads) => {
      if (ads[name]) setCode(ads[name]);
    });
  }, [name, isAdFree]);

  useEffect(() => {
    if (!code || !containerRef.current || injectedRef.current || dismissed) return;
    injectedRef.current = true;
    const cleanup = injectAdCode(containerRef.current, code);

    return () => {
      if (cleanup) cleanup();
    };
  }, [code, dismissed]);

  if (isAdFree || !code || dismissed) return null;

  return (
    <div className={`ad-slot relative ${className}`}>
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-1 right-1 z-10 w-7 h-7 sm:w-6 sm:h-6 rounded-full bg-black/80 border border-white/20 flex items-center justify-center text-white/90 hover:text-white hover:bg-red-600 transition-all shadow-lg"
        title="Tutup iklan"
        aria-label="Tutup iklan"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
      <div ref={containerRef} className="overflow-hidden" />
    </div>
  );
}
