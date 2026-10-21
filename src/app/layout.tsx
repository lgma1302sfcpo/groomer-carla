import type { Metadata, Viewport } from "next";

import { AppProviders } from "@/contexts/app-providers";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Teste",
    template: "%s | Teste"
  },
  description: "Sistema de gestão da Teste.",
  manifest: "/manifest.json",
  icons: {
    icon: "/logo.svg",
    apple: "/logo.svg"
  }
};

export const viewport: Viewport = {
  themeColor: "#173e91"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
