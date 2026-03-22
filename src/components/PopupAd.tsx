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
    return () => { if (cleanup) cleanup(); };
  }, [visible, code]);

  const close = () => {
    setVisible(false);
    sessionStorage.setItem("kv_popup_closed", "1");
  };

  if (!visible || !code || isAdFree) return null;

  return (
    <div className="w-full isolate relative z-0">
      <div className="relative flex justify-center py-1">
        <div ref={adRef} className="overflow-hidden" />
        <button
          onClick={close}
          className="absolute top-1 right-2 z-10 w-7 h-7 rounded-full bg-black/70 border border-white/20 flex items-center justify-center text-white/80 hover:text-white hover:bg-red-600 transition-colors shadow-lg"
          title="Tutup iklan"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
