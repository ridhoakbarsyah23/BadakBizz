import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BadakBizz - Solusi Andal untuk Bisnis Anda",
  description: "Builtbfor Business",
  icons: {
    icon: "/BadakBizz.jpeg",
  }
};

import { AuthProvider } from "@/context/AuthContext";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className="font-sans h-full antialiased"
    >
      <body className="min-h-full">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
