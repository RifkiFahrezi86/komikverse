import { useEffect, useRef, useState } from "react";
import { useAuth } from "../lib/auth";

const AD_KEY = "0765c0653cd6aee612fcada9c290485e";
const INVOKE_DOMAIN = "www.highperformancegate.com";

/**
 * Sticky bottom banner 320x50 — khusus mobile.
 * Bisa ditutup, tidak menghalangi navigasi.
 */
export default function MobileStickyAd() {
  const { isAdFree } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const injectedRef = useRef(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (isAdFree || dismissed || injectedRef.current || !containerRef.current) return;
    injectedRef.current = true;

    const container = containerRef.current;

    // Iframe isolation: load ad in its own document context
    const iframe = document.createElement("iframe");
    iframe.style.cssText = "width:320px;height:50px;border:none;overflow:hidden;display:block;margin:0 auto;";
    iframe.scrolling = "no";
    iframe.setAttribute("frameBorder", "0");
    container.appendChild(iframe);

    try {
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(
          `<!DOCTYPE html><html><head><style>*{margin:0;padding:0}body{overflow:hidden}</style></head>` +
          `<body>` +
          `<script>var atOptions={'key':'${AD_KEY}','format':'iframe','height':50,'width':320,'params':{}};<\/script>` +
          `<script src="https://${INVOKE_DOMAIN}/${AD_KEY}/invoke.js"><\/script>` +
          `</body></html>`
        );
        doc.close();
      }
    } catch {
      // contentDocument blocked
    }

    return () => {
      container.innerHTML = "";
      injectedRef.current = false;
    };
  }, [isAdFree, dismissed]);

  if (isAdFree || dismissed) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden flex flex-col items-center"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="relative bg-[#0e0e16]/95 backdrop-blur-sm border-t border-white/[0.06] w-full flex justify-center py-1">
        <button
          onClick={() => setDismissed(true)}
          className="absolute -top-6 right-2 z-50 w-6 h-6 rounded-full bg-black/80 border border-white/20 flex items-center justify-center text-white/80 hover:text-white hover:bg-red-600 transition-all shadow-lg"
          title="Tutup iklan"
          aria-label="Tutup iklan"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
        <div ref={containerRef} className="overflow-hidden" style={{ maxWidth: 320, maxHeight: 50 }} />
      </div>
    </div>
  );
}
