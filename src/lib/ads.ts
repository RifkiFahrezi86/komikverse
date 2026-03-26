/**
 * Shared ad-code fetcher & script injection utilities.
 * Single cache — all ad components share one API call.
 * Prefetch starts at module load time for fastest first paint.
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

// Prefetch: start the API call NOW (module load) so it's likely
// resolved by the time any ad component mounts.
getAds();

// ─── Serialized Script Injection Queue ────────────────────
// Adsterra invoke.js reads window.atOptions globally.
// Scripts must run one-at-a-time to prevent race conditions.
let adQueue: Promise<void> = Promise.resolve();

export function injectAdCode(
  container: HTMLElement,
  adCode: string
): () => void {
  let cancelled = false;

  adQueue = adQueue.then(
    () =>
      new Promise<void>((resolve) => {
        if (cancelled) {
          resolve();
          return;
        }

        // Safety timeout — move on even if script hangs
        const timer = setTimeout(resolve, 3000);

        const temp = document.createElement("div");
        temp.innerHTML = adCode;

        const scripts: HTMLScriptElement[] = [];
        const nodes: Node[] = [];

        while (temp.firstChild) {
          const node = temp.firstChild;
          temp.removeChild(node);
          if (node instanceof HTMLScriptElement) {
            scripts.push(node);
          } else {
            nodes.push(node);
          }
        }

        // Non-script nodes first (container divs, etc.)
        nodes.forEach((n) => container.appendChild(n));

        // Scripts sequentially: inline atOptions → external invoke.js
        let i = 0;
        function nextScript() {
          if (i >= scripts.length) {
            clearTimeout(timer);
            setTimeout(resolve, 50);
            return;
          }
          const old = scripts[i++];
          const ns = document.createElement("script");
          for (const attr of Array.from(old.attributes)) {
            ns.setAttribute(attr.name, attr.value);
          }
          if (old.textContent && !old.src) {
            ns.textContent = old.textContent;
            container.appendChild(ns);
            nextScript();
          } else if (old.src) {
            ns.onload = nextScript;
            ns.onerror = nextScript;
            container.appendChild(ns);
          } else {
            nextScript();
          }
        }
        nextScript();
      })
  );

  return () => {
    cancelled = true;
  };
}
