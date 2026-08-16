import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Kivo POS - Sell. Track. Grow.",
  description: "Modern Point of Sale & Business Management Platform",
};

import { TooltipProvider } from "@/components/ui/tooltip";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} font-sans h-full antialiased`}
    >
      <body className="min-h-full">
        <TooltipProvider>
          {children}
        </TooltipProvider>
      </body>
    </html>
  );
}
