import { ReactNode } from "react";
import Navigation from "./Navigation";
import Footer from "./Footer";
import MobileCTABar from "./MobileCTABar";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-bg text-text">
      <Navigation />
      <main>{children}</main>
      <Footer />
      <MobileCTABar />
    </div>
  );
}
