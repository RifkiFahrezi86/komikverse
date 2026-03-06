import { useEffect, useState, useRef } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || atob("aHR0cHM6Ly9rb21pa3ZlcnNlLWFwaS1hbWJlci52ZXJjZWwuYXBwL2FwaQ==");
const ADS_URL = API_BASE.replace(/\/api\/?$/, "/api/ads");

// Cache ads globally so we don't refetch on every component mount
let adsCache: Record<string, string> | null = null;
let adsFetchPromise: Promise<Record<string, string>> | null = null;

async function fetchAds(): Promise<Record<string, string>> {
  if (adsCache) return adsCache;
  if (adsFetchPromise) return adsFetchPromise;
  adsFetchPromise = fetch(ADS_URL)
    .then((r) => r.json())
    .then((d) => {
      adsCache = d.data || {};
      return adsCache!;
    })
    .catch(() => {
      adsCache = {};
      return {};
    });
  return adsFetchPromise;
}

// Invalidate cache periodically (5 minutes)
setInterval(() => { adsCache = null; adsFetchPromise = null; }, 5 * 60 * 1000);

export default function AdSlot({ name, className = "" }: { name: string; className?: string }) {
  const [html, setHtml] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchAds().then((ads) => {
      if (ads[name]) setHtml(ads[name]);
    });
  }, [name]);

  // Execute scripts in ad HTML
  useEffect(() => {
    if (!html || !containerRef.current) return;
    const container = containerRef.current;
    // Re-insert script tags so they execute
    const scripts = container.querySelectorAll("script");
    scripts.forEach((oldScript) => {
      const newScript = document.createElement("script");
      Array.from(oldScript.attributes).forEach((attr) =>
        newScript.setAttribute(attr.name, attr.value)
      );
      newScript.textContent = oldScript.textContent;
      oldScript.parentNode?.replaceChild(newScript, oldScript);
    });
  }, [html]);

  if (!html) return null;

  return (
    <div
      ref={containerRef}
      className={`ad-slot overflow-hidden ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
