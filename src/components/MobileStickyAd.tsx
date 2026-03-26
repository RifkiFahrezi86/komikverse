import { useEffect, useRef, useState } from "react";
import { useAuth } from "../lib/auth";

const API_BASE = import.meta.env.VITE_API_BASE || atob("aHR0cHM6Ly9rb21pa3ZlcnNlLWFwaS1hbWJlci52ZXJjZWwuYXBwL2FwaQ==");

/**
 * Sticky bottom banner — khusus mobile.
 * Mengambil ad_code dari slot "sticky-mobile" di database.
 */
export default function MobileStickyAd() {
  const { isAdFree } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const injectedRef = useRef(false);
  const [dismissed, setDismissed] = useState(false);
  const [adCode, setAdCode] = useState<string | null>(null);

  useEffect(() => {
    if (isAdFree || dismissed) return;
    fetch(`${API_BASE}/ads`)
      .then((r) => r.json())
      .then((d) => {
        const ads = d.ads || {};
        setAdCode(ads["sticky-mobile"] || "");
      })
      .catch(() => setAdCode(""));
  }, [isAdFree, dismissed]);

  useEffect(() => {
    if (!adCode || !containerRef.current || injectedRef.current) return;
    injectedRef.current = true;
    const container = containerRef.current;
    container.innerHTML = "";

    const temp = document.createElement("div");
    temp.innerHTML = adCode;
    const scripts = temp.querySelectorAll("script");
    const nonScript = adCode.replace(/<script[\s\S]*?<\/script>/gi, "");

    if (nonScript.trim()) {
      const wrapper = document.createElement("div");
      wrapper.innerHTML = nonScript;
      container.appendChild(wrapper);
    }

    scripts.forEach((origScript) => {
      const script = document.createElement("script");
      if (origScript.src) {
        script.src = origScript.src;
        script.async = true;
      } else {
        script.textContent = origScript.textContent;
      }
      Array.from(origScript.attributes).forEach((attr) => {
        if (attr.name !== "src") script.setAttribute(attr.name, attr.value);
      });
      container.appendChild(script);
    });

    return () => {
      container.innerHTML = "";
      injectedRef.current = false;
    };
  }, [adCode]);

  if (isAdFree || dismissed) return null;
  if (!adCode) return null;

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
