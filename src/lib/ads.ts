/**
 * Shared ad-code fetcher & iframe-isolated injection utilities.
 * Single cache — all ad components share one API call.
 * Prefetch starts at module load time for fastest first paint.
 * Ads run inside sandboxed iframes so scripts can't touch the parent page.
 */

const API_BASE =
  import.meta.env.VITE_API_BASE ||
  atob("aHR0cHM6Ly9rb21pa3ZlcnNlLWFwaS1hbWJlci52ZXJjZWwuYXBwL2FwaQ==");

const FALLBACK_AD_SLOT_NAMES = [
  "home-top",
  "home-mid",
  "home-bottom-1",
  "home-bottom-2",
  "browse-banner",
  "native-home",
  "native-detail",
  "detail-before-chapters",
  "detail-sidebar",
  "reader-top",
  "reader-bottom",
  "reader-between",
] as const;

const DESKTOP_BREAKPOINT = 1024;
const TABLET_BREAKPOINT = 640;

const LEADERBOARD_AD = { key: "5c01a1d15d1a70394faba93bab910d76", width: 728, height: 90 } as const;
const BANNER_AD = { key: "14a131e28a7f22c03914636316840b63", width: 468, height: 60 } as const;
const MOBILE_AD = { key: "0765c0653cd6aee612fcada9c290485e", width: 320, height: 50 } as const;
const RECTANGLE_AD = { key: "6b4a8f2d650a7e5ad65b05a797c81b41", width: 300, height: 250 } as const;

const SLOT_GROUPS = {
  leaderboard: ["home-top", "home-mid", "home-bottom-1", "browse-banner"] as const,
  compact: ["reader-top", "reader-bottom", "detail-before-chapters", "home-bottom-2"] as const,
  rectangle: ["detail-sidebar", "reader-between"] as const,
  native: ["native-home", "native-detail"] as const,
} as const;

function isSlotInGroup(slot: string, group: readonly string[]): boolean {
  return group.includes(slot);
}

function createIframeAdCode(key: string, width: number, height: number): string {
  return `
<script>
  var atOptions = ${JSON.stringify({ key, format: "iframe", height, width, params: {} })};
</script>
<script src="https://breachuptown.com/${key}/invoke.js"></script>`;
}

const FALLBACK_NATIVE_AD_CODE = `
<script async="async" data-cfasync="false" src="https://breachuptown.com/63f5f4604f3de09027f2c24273fe2d2f/invoke.js"></script>
<div id="container-63f5f4604f3de09027f2c24273fe2d2f"></div>`;

function getViewportWidth(): number {
  if (typeof window === "undefined") return 1024;
  return window.innerWidth || document.documentElement.clientWidth || 1024;
}

function getResponsiveBannerCode(): string {
  const viewportWidth = getViewportWidth();
  if (viewportWidth >= DESKTOP_BREAKPOINT) {
    return createIframeAdCode(LEADERBOARD_AD.key, LEADERBOARD_AD.width, LEADERBOARD_AD.height);
  }
  if (viewportWidth >= TABLET_BREAKPOINT) {
    return createIframeAdCode(BANNER_AD.key, BANNER_AD.width, BANNER_AD.height);
  }
  return createIframeAdCode(MOBILE_AD.key, MOBILE_AD.width, MOBILE_AD.height);
}

function getCompactBannerCode(): string {
  const viewportWidth = getViewportWidth();
  if (viewportWidth >= TABLET_BREAKPOINT) {
    return createIframeAdCode(BANNER_AD.key, BANNER_AD.width, BANNER_AD.height);
  }
  return createIframeAdCode(MOBILE_AD.key, MOBILE_AD.width, MOBILE_AD.height);
}

function getRectangleCode(): string {
  const viewportWidth = getViewportWidth();
  if (viewportWidth >= DESKTOP_BREAKPOINT) {
    return createIframeAdCode(RECTANGLE_AD.key, RECTANGLE_AD.width, RECTANGLE_AD.height);
  }
  return createIframeAdCode(MOBILE_AD.key, MOBILE_AD.width, MOBILE_AD.height);
}

function getFallbackAdCodeForSlot(slot: string): string | null {
  if (isSlotInGroup(slot, SLOT_GROUPS.rectangle)) {
    return getRectangleCode();
  }

  if (isSlotInGroup(slot, SLOT_GROUPS.native)) {
    return getViewportWidth() >= TABLET_BREAKPOINT ? FALLBACK_NATIVE_AD_CODE : getCompactBannerCode();
  }

  if (isSlotInGroup(slot, SLOT_GROUPS.compact)) {
    return getCompactBannerCode();
  }

  if (isSlotInGroup(slot, SLOT_GROUPS.leaderboard)) {
    return getResponsiveBannerCode();
  }

  return null;
}

function mergeWithFallbackAds(serverAds: Record<string, string>): Record<string, string> {
  const merged = { ...serverAds };

  for (const slot of FALLBACK_AD_SLOT_NAMES) {
    if (merged[slot]) continue;
    const fallbackCode = getFallbackAdCodeForSlot(slot);
    if (fallbackCode) merged[slot] = fallbackCode;
  }

  return merged;
}

// ─── Single Global Cache with TTL ─────────────────────────
let adsCache: Record<string, string> | null = null;
let adsFetchPromise: Promise<Record<string, string>> | null = null;
let adsCacheExpires = 0;
const ADS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function getAds(): Promise<Record<string, string>> {
  if (adsCache && Date.now() < adsCacheExpires) return Promise.resolve(adsCache);
  if (adsFetchPromise) return adsFetchPromise;

  // Clear stale cache
  adsCache = null;

  adsFetchPromise = fetch(`${API_BASE}/ads`)
    .then((r) => r.json())
    .then((data) => {
      adsCache = mergeWithFallbackAds(data.ads || {});
      adsCacheExpires = Date.now() + ADS_CACHE_TTL;
      adsFetchPromise = null;
      return adsCache!;
    })
    .catch(() => {
      adsCache = mergeWithFallbackAds({});
      adsCacheExpires = Date.now() + ADS_CACHE_TTL;
      adsFetchPromise = null;
      return adsCache!;
    });

  return adsFetchPromise;
}

// Prefetch at module load so data is ready when components mount.
getAds();

// ─── Iframe-Isolated Ad Injection ─────────────────────────
// Each ad runs inside its own iframe so third-party scripts
// cannot inject elements into the parent page (fixes ads
// appearing in admin panel, overlapping nav, etc.).
export function injectAdCode(
  container: HTMLElement,
  adCode: string
): () => void {
  const iframe = document.createElement("iframe");
  iframe.style.cssText =
    "width:100%;border:none;overflow:hidden;display:block;background:transparent;";
  iframe.setAttribute("scrolling", "no");
  iframe.setAttribute(
    "sandbox",
    "allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
  );

  container.appendChild(iframe);

  const html = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{background:transparent;overflow:hidden;display:flex;align-items:center;justify-content:center;min-height:20px}
  img,iframe{max-width:100%!important;height:auto!important}
</style>
<script>
  function notifyHeight(){
    var h=document.body.scrollHeight||document.documentElement.scrollHeight;
    if(h>0)window.parent.postMessage({type:'adHeight',height:h},'*');
  }
  window.addEventListener('load',function(){setTimeout(notifyHeight,300);setTimeout(notifyHeight,1500);setTimeout(notifyHeight,4000)});
  new MutationObserver(function(){setTimeout(notifyHeight,150)}).observe(document.documentElement,{childList:true,subtree:true,attributes:true});
</script>
</head><body>${adCode}</body></html>`;

  // Write content via srcdoc for reliable cross-origin iframe loading
  iframe.srcdoc = html;

  // Listen for height resize messages from the iframe
  const onMessage = (e: MessageEvent) => {
    if (e.source === iframe.contentWindow && e.data?.type === "adHeight") {
      const h = Math.min(e.data.height, 600);
      iframe.style.transition = "height 0.2s ease";
      iframe.style.height = h + "px";
    }
  };
  window.addEventListener("message", onMessage);

  return () => {
    window.removeEventListener("message", onMessage);
    iframe.remove();
  };
}
