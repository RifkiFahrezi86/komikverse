import { Outlet } from "react-router-dom";
import PopupAd from "../components/PopupAd";

export default function ReaderLayout() {
  return (
    <>
      <Outlet />
      <PopupAd />
    </>
  );
}
