import type { Metadata } from "next";
import { Cormorant_Garamond, Fira_Code } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import { NotationProvider } from "@/contexts/NotationContext";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const firaCode = Fira_Code({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Violin Studio",
  description: "Learn violin notes, practice with Guitar Hero mode, and master sight-reading",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${cormorant.variable} ${firaCode.variable} antialiased`}
      >
        <NotationProvider>
          <Navbar />
          <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
        </NotationProvider>
      </body>
    </html>
  );
}
