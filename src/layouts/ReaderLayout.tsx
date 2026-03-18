import { Outlet } from "react-router-dom";
import GlobalAds from "../components/GlobalAds";
import PopupAd from "../components/PopupAd";

export default function ReaderLayout() {
  return (
    <>
      <Outlet />
      <GlobalAds />
      <PopupAd />
    </>
  );
}
