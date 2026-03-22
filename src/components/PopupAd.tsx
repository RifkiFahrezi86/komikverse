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
  const [closing, setClosing] = useState(false);
  const [empty, setEmpty] = useState(false);
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

    const timer = setTimeout(() => {
      const el = adRef.current;
      if (!el) return;
      if (!el.querySelector("iframe") && !el.querySelector("img") && el.offsetHeight < 10) {
        setEmpty(true);
        setVisible(false);
      }
    }, 5000);

    return () => {
      clearTimeout(timer);
      if (cleanup) cleanup();
    };
  }, [visible, code]);

  const close = () => {
    setClosing(true);
    setTimeout(() => {
      setVisible(false);
      sessionStorage.setItem("kv_popup_closed", "1");
    }, 300);
  };

  if (!visible || !code || isAdFree || empty) return null;

  return (
    <div
      className={`w-full isolate relative z-0 transition-all duration-300 ${
        closing ? "max-h-0 opacity-0 overflow-hidden" : "max-h-[200px] opacity-100"
      }`}
    >
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
