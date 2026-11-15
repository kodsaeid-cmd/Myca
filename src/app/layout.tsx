import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./extras.css";

export const metadata: Metadata = {
  title: "مایکا",
  description: "مراقبت مطمئن در خانه؛ انتخاب سریع و شفاف برای خانواده شما.",
  applicationName: "مایکا",
  icons: { icon: "https://mycaapp.com/icon.png" }
};

export const viewport: Viewport = {
  width: "device-width", initialScale: 1, maximumScale: 1, viewportFit: "cover"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="fa" dir="rtl"><body>{children}</body></html>;
}