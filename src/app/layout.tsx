import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GENSET CARE | Berau Coal Electrification",
  description: "Sistem pengelolaan inspeksi P2H genset Berau Coal Electrification"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="id"><body>{children}</body></html>;
}
