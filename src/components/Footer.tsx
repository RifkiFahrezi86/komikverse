import { Link } from "react-router-dom";
import { BookOpen, ExternalLink } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-white/[0.04] hidden md:block">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gradient-to-br from-[#f97316] to-[#ea580c] rounded flex items-center justify-center">
              <BookOpen size={12} className="text-white" />
            </div>
            <span className="font-display font-bold text-sm text-white/85 tracking-tight">
              Komik<span className="text-[#f97316]">Verse</span>
            </span>
          </Link>

          <div className="flex items-center gap-4 text-[11px] text-[#5a5a6a] font-body">
            <span>
              Dibuat oleh{" "}
              <span className="text-[#f97316]">Rifki Fahrezi</span>
            </span>
            <span className="text-[#2a2a3a]">|</span>
            <a
              href="https://zogaming.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[#5a5a6a] hover:text-[#f97316] transition-colors"
            >
              Steam Sharing
              <ExternalLink size={10} />
            </a>
            <a
              href="https://website-joki.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[#5a5a6a] hover:text-[#f97316] transition-colors"
            >
              Web-Joki
              <ExternalLink size={10} />
            </a>
          </div>

          <p className="text-[10px] text-[#3a3a4a] font-body">
            &copy; {new Date().getFullYear()} KomikVerse. Semua konten komik adalah milik pencipta aslinya.
          </p>
        </div>
      </div>
    </footer>
  );
}
