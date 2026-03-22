import { useEffect, useState, useRef } from "react";
import { X } from "lucide-react";
import { useAuth } from "../lib/auth";
import { fetchAds, injectAdCode } from "./AdSlot";

/**
 * Inline dismissible banner ad below navbar.
 * Uses the "popup-global" ad slot from the database.
 * Dismissed once per session (sessionStorage).
 */
export default function PopupAd() {
  const { isAdFree, loading } = useAuth();
  const [visible, setVisible] = useState(false);
  const [code, setCode] = useState("");
  const [closing, setClosing] = useState(false);
  const adRef = useRef<HTMLDivElement>(null);
  const injectedRef = useRef(false);

  useEffect(() => {
    if (loading || isAdFree) return;
    if (sessionStorage.getItem("kv_popup_closed")) return;

    fetchAds().then((ads) => {
      const c = ads["popup-global"];
      if (!c) return;
      if (!c.includes("atOptions") && !c.includes("container-") && !c.includes("<div")) {
        return;
      }
      setCode(c);
      setVisible(true);
    });
  }, [isAdFree, loading]);

  useEffect(() => {
    if (!visible || !code || !adRef.current || injectedRef.current) return;
    injectedRef.current = true;
    injectAdCode(adRef.current, code);
  }, [visible, code]);

  const close = () => {
    setClosing(true);
    setTimeout(() => {
      setVisible(false);
      sessionStorage.setItem("kv_popup_closed", "1");
    }, 300);
  };

  if (!visible || !code || isAdFree) return null;

  return (
    <div
      className={`w-full bg-[#16161f] border-b border-white/[0.06] transition-all duration-300 ${
        closing ? "max-h-0 opacity-0 overflow-hidden" : "max-h-[200px] opacity-100"
      }`}
    >
      <div className="max-w-5xl mx-auto px-3 py-2 flex items-center gap-2">
        <div ref={adRef} className="flex-1 flex items-center justify-center min-h-[50px] overflow-hidden" />
        <button
          onClick={close}
          className="shrink-0 w-7 h-7 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          title="Tutup"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
