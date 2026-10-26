import type { Metadata, Viewport } from "next";

import { AppProviders } from "@/contexts/app-providers";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL || process.env.NEXTAUTH_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000")),
  title: {
    default: "Groomer Carla",
    template: "%s | Groomer Carla"
  },
  description: "Sistema de gestão da Groomer Carla.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "16x16 32x32 48x48", type: "image/x-icon" },
      { url: "/icons/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }
    ],
    shortcut: "/favicon.ico",
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }]
  },
  appleWebApp: { capable: true, title: "Groomer Carla", statusBarStyle: "default" },
  openGraph: {
    title: "Groomer Carla",
    description: "Banho e tosa · Saúde · Beleza · Bem-estar.",
    images: [{ url: "/social-card.jpg", width: 1200, height: 630, alt: "Logo Groomer Carla" }]
  },
  twitter: { card: "summary_large_image", title: "Groomer Carla", images: ["/social-card.jpg"] }
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
