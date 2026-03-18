import { Outlet } from "react-router-dom";
import GlobalAds from "../components/GlobalAds";

export default function ReaderLayout() {
  return (
    <>
      <Outlet />
      <GlobalAds />
    </>
  );
}
