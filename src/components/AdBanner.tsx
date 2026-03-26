import { useEffect, useRef, useState } from "react";
import { useAuth } from "../lib/auth";

// ────────────────────────────────────────────────
// Ad Configurations (Adsterra)
// ────────────────────────────────────────────────

const AD_CONFIGS = {
  "banner-728x90": { key: "5c01a1d15d1a70394faba93bab910d76", width: 728, height: 90 },
  "banner-300x250": { key: "6b4a8f2d650a7e5ad65b05a797c81b41", width: 300, height: 250 },
  "banner-468x60": { key: "14a131e28a7f22c03914636316840b63", width: 468, height: 60 },
  "banner-320x50": { key: "0765c0653cd6aee612fcada9c290485e", width: 320, height: 50 },
} as const;

export type BannerType = keyof typeof AD_CONFIGS;

// ────────────────────────────────────────────────
// Anti-Redirect Guard
// Prevents ad scripts from hijacking navigation
// ────────────────────────────────────────────────

let guardActive = false;

function ensureAntiRedirectGuard() {
  if (guardActive) return;
  guardActive = true;

  // Allow 1 popup for popunder, then block all
  let popupAllowed = !sessionStorage.getItem("kv_popunder_fired");

  const origOpen = window.open;
  window.open = function (...args: Parameters<typeof window.open>) {
    // Block popups on reader pages
    if (window.location.pathname.startsWith("/baca/")) return null;
    if (popupAllowed) {
      popupAllowed = false;
      sessionStorage.setItem("kv_popunder_fired", "1");
      return origOpen.apply(window, args);
    }
    return null;
  } as typeof window.open;

  // Remove invisible click-jacking overlays
  const observer = new MutationObserver((mutations) => {
    for (const mut of mutations) {
      for (const node of mut.addedNodes) {
        if (!(node instanceof HTMLElement)) continue;
        if (node.closest(".ad-slot")) continue;
        const s = node.style;
        if (
          node.tagName === "DIV" &&
          (s.position === "fixed" || s.position === "absolute") &&
          s.zIndex && parseInt(s.zIndex) > 900 &&
          (s.opacity === "0" || parseFloat(s.opacity || "1") < 0.05) &&
          !node.id?.includes("container-")
        ) {
          node.remove();
          continue;
        }
        if (node.tagName === "A" && (s.position === "fixed" || s.position === "absolute")) {
          const rect = node.getBoundingClientRect();
          if (rect.width > window.innerWidth * 0.5 || rect.height > window.innerHeight * 0.5) {
            node.remove();
          }
        }
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

// ────────────────────────────────────────────────
// Serial Ad Loading Queue
// Ensures atOptions is correct for each invoke.js
// ────────────────────────────────────────────────

let adQueue: Promise<void> = Promise.resolve();

function queueBannerLoad(
  container: HTMLElement,
  config: { key: string; width: number; height: number },
): void {
  adQueue = adQueue.then(
    () =>
      new Promise<void>((resolve) => {
        if (!container.isConnected) { resolve(); return; }
        (window as any).atOptions = {
          key: config.key,
          format: "iframe",
          height: config.height,
          width: config.width,
          params: {},
        };
        const script = document.createElement("script");
        script.type = "text/javascript";
        script.src = `//www.highperformanceformat.com/${config.key}/invoke.js`;
        script.onload = () => resolve();
        script.onerror = () => resolve();
        container.appendChild(script);
      }),
  );
}

// ────────────────────────────────────────────────
// Close Button
// ────────────────────────────────────────────────

function CloseBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); e.preventDefault(); onClick(); }}
      className="absolute top-1 right-1 z-[999] w-8 h-8 sm:w-7 sm:h-7 rounded-full bg-[#1a1a2e] border-2 border-white/40 flex items-center justify-center text-white hover:bg-red-600 hover:border-red-500 transition-all shadow-[0_2px_8px_rgba(0,0,0,0.6)] cursor-pointer"
      title="Tutup iklan"
      aria-label="Tutup iklan"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    </button>
  );
}

// ────────────────────────────────────────────────
// AdBanner — Renders a specific Adsterra banner
// ────────────────────────────────────────────────

export function AdBanner({ type, className = "" }: { type: BannerType; className?: string }) {
  const { isAdFree } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const injectedRef = useRef(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (isAdFree || dismissed || !containerRef.current || injectedRef.current) return;
    injectedRef.current = true;
    ensureAntiRedirectGuard();
    queueBannerLoad(containerRef.current, AD_CONFIGS[type]);
    return () => {
      if (containerRef.current) containerRef.current.innerHTML = "";
      injectedRef.current = false;
    };
  }, [type, isAdFree, dismissed]);

  if (isAdFree || dismissed) return null;

  return (
    <div className={`ad-slot relative inline-block ${className}`}>
      <CloseBtn onClick={() => setDismissed(true)} />
      <div ref={containerRef} className="flex items-center justify-center" />
    </div>
  );
}

// ────────────────────────────────────────────────
// ResponsiveBanner
// 728x90 desktop / 468x60 tablet / 320x50 mobile
// Uses JS media query to avoid loading multiple ads
// ────────────────────────────────────────────────

function useScreenTier(): "desktop" | "tablet" | "mobile" {
  const [tier, setTier] = useState<"desktop" | "tablet" | "mobile">(() => {
    if (typeof window === "undefined") return "desktop";
    if (window.innerWidth >= 1024) return "desktop";
    if (window.innerWidth >= 640) return "tablet";
    return "mobile";
  });

  useEffect(() => {
    const update = () => {
      if (window.innerWidth >= 1024) setTier("desktop");
      else if (window.innerWidth >= 640) setTier("tablet");
      else setTier("mobile");
    };
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return tier;
}

export function ResponsiveBanner({ className = "" }: { className?: string }) {
  const tier = useScreenTier();
  const type: BannerType =
    tier === "desktop" ? "banner-728x90" : tier === "tablet" ? "banner-468x60" : "banner-320x50";
  return <AdBanner key={type} type={type} className={className} />;
}

// ────────────────────────────────────────────────
// NativeAd — Adsterra native banner widget
// Use only ONCE per page (container ID must be unique)
// ────────────────────────────────────────────────

export function NativeAd({ className = "" }: { className?: string }) {
  const { isAdFree } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const injectedRef = useRef(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (isAdFree || dismissed || !containerRef.current || injectedRef.current) return;
    injectedRef.current = true;
    ensureAntiRedirectGuard();

    const container = containerRef.current;

    // Native banner container
    const nativeDiv = document.createElement("div");
    nativeDiv.id = `container-63f5f4604f3de09027f2c24273fe2d2f`;
    container.appendChild(nativeDiv);

    // Native banner script
    const script = document.createElement("script");
    script.async = true;
    script.setAttribute("data-cfasync", "false");
    script.src = "https://pl28923740.profitablecpmratenetwork.com/63f5f4604f3de09027f2c24273fe2d2f/invoke.js";
    container.appendChild(script);

    return () => {
      container.innerHTML = "";
      injectedRef.current = false;
    };
  }, [isAdFree, dismissed]);

  if (isAdFree || dismissed) return null;

  return (
    <div className={`ad-slot relative ${className}`}>
      <CloseBtn onClick={() => setDismissed(true)} />
      <div ref={containerRef} />
    </div>
  );
}

// ────────────────────────────────────────────────
// Popunder — 1x per session, 30s delay, not on reader
// ────────────────────────────────────────────────

export function Popunder() {
  const { isAdFree } = useAuth();
  const injectedRef = useRef(false);

  useEffect(() => {
    if (isAdFree || injectedRef.current) return;
    if (sessionStorage.getItem("kv_popunder_done")) return;

    const timer = setTimeout(() => {
      if (injectedRef.current) return;
      // Don't fire on reader pages
      if (window.location.pathname.startsWith("/baca/")) return;
      injectedRef.current = true;
      sessionStorage.setItem("kv_popunder_done", "1");
      ensureAntiRedirectGuard();

      const script = document.createElement("script");
      script.src = "https://pl28923689.profitablecpmratenetwork.com/5a/5e/18/5a5e18adc44d72973fdb14f945055f50.js";
      script.async = true;
      document.body.appendChild(script);
    }, 30000);

    return () => clearTimeout(timer);
  }, [isAdFree]);

  return null;
}

// ────────────────────────────────────────────────
// MobileStickyAd — 320x50 sticky bottom, mobile only
// ────────────────────────────────────────────────

export function MobileStickyAd() {
  const { isAdFree } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const injectedRef = useRef(false);
  const [dismissed, setDismissed] = useState(false);
  const tier = useScreenTier();

  useEffect(() => {
    if (isAdFree || dismissed || tier !== "mobile" || !containerRef.current || injectedRef.current) return;
    injectedRef.current = true;
    ensureAntiRedirectGuard();
    queueBannerLoad(containerRef.current, AD_CONFIGS["banner-320x50"]);
    return () => {
      if (containerRef.current) containerRef.current.innerHTML = "";
      injectedRef.current = false;
    };
  }, [isAdFree, dismissed, tier]);

  if (isAdFree || dismissed || tier !== "mobile") return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="bg-[#0a0a0f]/95 backdrop-blur-sm border-t border-white/[0.06] relative">
        <button
          onClick={() => setDismissed(true)}
          className="absolute -top-4 right-3 z-[999] w-8 h-8 rounded-full bg-[#1a1a2e] border-2 border-white/40 flex items-center justify-center text-white hover:bg-red-600 hover:border-red-500 transition-all shadow-[0_2px_8px_rgba(0,0,0,0.6)] cursor-pointer"
          title="Tutup iklan"
          aria-label="Tutup iklan"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
        <div ref={containerRef} className="flex justify-center py-1" />
      </div>
    </div>
  );
}
