import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import PopunderAd from "../components/PopupAd";
import MobileStickyAd from "../components/MobileStickyAd";

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <PopunderAd />
      <main className="flex-grow pb-14 md:pb-0">
        <Outlet />
      </main>
      <Footer />
      <MobileStickyAd />
    </div>
  );
}
