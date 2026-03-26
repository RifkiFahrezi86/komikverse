/**
 * Shared ad-code fetcher & iframe-isolated injection utilities.
 * Single cache — all ad components share one API call.
 * Prefetch starts at module load time for fastest first paint.
 * Ads run inside sandboxed iframes so scripts can't touch the parent page.
 */

const API_BASE =
  import.meta.env.VITE_API_BASE ||
  atob("aHR0cHM6Ly9rb21pa3ZlcnNlLWFwaS1hbWJlci52ZXJjZWwuYXBwL2FwaQ==");

// ─── Single Global Cache ──────────────────────────────────
let adsCache: Record<string, string> | null = null;
let adsFetchPromise: Promise<Record<string, string>> | null = null;

export function getAds(): Promise<Record<string, string>> {
  if (adsCache) return Promise.resolve(adsCache);
  if (adsFetchPromise) return adsFetchPromise;

  adsFetchPromise = fetch(`${API_BASE}/ads`)
    .then((r) => r.json())
    .then((data) => {
      adsCache = data.ads || {};
      return adsCache!;
    })
    .catch(() => {
      adsCache = {};
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
