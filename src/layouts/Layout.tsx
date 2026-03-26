import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { Popunder, MobileStickyAd } from "../components/AdBanner";

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow pb-14 md:pb-0">
        <Outlet />
      </main>
      <Footer />
      <Popunder />
      <MobileStickyAd />
    </div>
  );
}
