import type { Metadata } from "next";
import "./globals.css";
import NavBar from "@/components/NavBar";

export const metadata: Metadata = {
  title: "Boekhouding - Leatherpride",
  description: "Dagelijkse kassa- en BTW-administratie",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl" className="h-full">
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">
        <NavBar />
        <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
