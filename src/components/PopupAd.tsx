import { useEffect, useState, useRef } from "react";
import { X } from "lucide-react";
import { useAuth } from "../lib/auth";
import { fetchAds, injectAdCode } from "./AdSlot";

/**
 * Popup / Interstitial ad overlay with close button.
 * Uses the "popup-global" ad slot from the database.
 * Shows once per session (sessionStorage), dismissed with close button.
 * Appears 3 seconds after page load so content loads first.
 */
export default function PopupAd() {
  const { isAdFree, loading } = useAuth();
  const [visible, setVisible] = useState(false);
  const [code, setCode] = useState("");
  const adRef = useRef<HTMLDivElement>(null);
  const injectedRef = useRef(false);

  // Fetch ad code after delay
  useEffect(() => {
    if (loading || isAdFree) return;
    if (sessionStorage.getItem("kv_popup_closed")) return;

    const timer = setTimeout(() => {
      fetchAds().then((ads) => {
        const c = ads["popup-global"];
        if (!c) return;
        setCode(c);
        setVisible(true);
      });
    }, 3000);

    return () => clearTimeout(timer);
  }, [isAdFree, loading]);

  // Inject ad AFTER the popup DOM is rendered
  useEffect(() => {
    if (!visible || !code || !adRef.current || injectedRef.current) return;
    injectedRef.current = true;
    injectAdCode(adRef.current, code);
  }, [visible, code]);

  const close = () => {
    setVisible(false);
    sessionStorage.setItem("kv_popup_closed", "1");
  };

  if (!visible || !code || isAdFree) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4" onClick={close}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative max-w-[750px] w-full bg-[#16161f] rounded-xl border border-white/[0.08] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={close}
          className="absolute top-2 right-2 z-10 w-8 h-8 rounded-full bg-black/60 border border-white/10 flex items-center justify-center text-white/80 hover:text-white hover:bg-black/80 transition-colors"
          title="Tutup"
        >
          <X size={18} />
        </button>

        {/* Ad content */}
        <div ref={adRef} className="p-4 flex items-center justify-center min-h-[200px]" />
      </div>
    </div>
  );
}
