import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BadakBizz - Your Biz, But Stronger",
  description: "Builtbfor Business",
  icons: {
    icon: "/BadakBizz.jpeg",
  }
};

import { TooltipProvider } from "@/components/ui/tooltip";

import { AuthProvider } from "@/context/AuthContext";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className="font-sans h-full antialiased"
    >
      <body className="min-h-full">
        <AuthProvider>
          <TooltipProvider>
            {children}
          </TooltipProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
