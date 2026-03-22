import { useEffect, useState, useRef } from "react";
import { X } from "lucide-react";
import { useAuth } from "../lib/auth";
import { fetchAds, injectAdCode } from "./AdSlot";

/**
 * Inline dismissible banner ad for the "popup-global" slot.
 * Displayed below navbar with close button. Dismiss once per session.
 * Uses `isolate` to prevent ad iframe z-index from overlapping navbar.
 */
export default function PopupAd() {
  const { isAdFree, loading } = useAuth();
  const [visible, setVisible] = useState(false);
  const [code, setCode] = useState("");
  const adRef = useRef<HTMLDivElement>(null);
  const injectedRef = useRef(false);

  useEffect(() => {
    if (loading || isAdFree) return;
    if (sessionStorage.getItem("kv_popup_closed")) return;
    fetchAds().then((ads) => {
      const c = ads["popup-global"];
      if (!c) return;
      if (!c.includes("atOptions") && !c.includes("container-") && !c.includes("<div")) return;
      setCode(c);
      setVisible(true);
    });
  }, [isAdFree, loading]);

  useEffect(() => {
    if (!visible || !code || !adRef.current || injectedRef.current) return;
    injectedRef.current = true;
    const cleanup = injectAdCode(adRef.current, code);

    // Hide container if ad doesn't actually render (e.g. ad blocker)
    const timer = setTimeout(() => {
      if (!adRef.current) return;
      const hasContent = adRef.current.querySelector("iframe, img, ins, .adsbygoogle");
      if (!hasContent && adRef.current.offsetHeight < 10) {
        setVisible(false);
      }
    }, 3000);

    return () => { clearTimeout(timer); if (cleanup) cleanup(); };
  }, [visible, code]);

  const close = () => {
    setVisible(false);
    sessionStorage.setItem("kv_popup_closed", "1");
  };

  if (!visible || !code || isAdFree) return null;

  return (
    <div className="w-full bg-[#16161f] border-b border-white/[0.06] isolate relative z-0">
      <div className="max-w-5xl mx-auto px-2 py-1.5 flex items-center gap-2">
        <div ref={adRef} className="flex-1 flex items-center justify-center overflow-hidden" />
        <button
          onClick={close}
          className="shrink-0 w-8 h-8 rounded-full bg-white/[0.08] border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-red-600 transition-colors"
          title="Tutup iklan"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
