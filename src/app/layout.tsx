import "./globals.css";
import type { Metadata } from "next";
import { Outfit, Playfair_Display, Sora, Source_Sans_3 } from "next/font/google";
import Providers from "@/app/providers";
import Toaster from "@/components/Toaster";
import WebVitals from "@/app/web-vitals";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

const displayFont = Sora({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-display",
});

const bodyFont = Source_Sans_3({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
});

const landingBodyFont = Outfit({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const landingDisplayFont = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-landing-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Sapienta — Portale Formazione",
  description: "Portale di formazione aziendale Sapienta",
  keywords: ["formazione", "corsi", "attestati", "sicurezza"],
  authors: [{ name: "Ente Formazione" }],
  robots: {
    index: false,
    follow: false,
  },
  icons: {
    icon: "/icons/sapienta-remove.ico",
    apple: "/icons/sapienta-remove.png",
  },
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it">
      <body
        className={`${bodyFont.variable} ${displayFont.variable} ${landingBodyFont.variable} ${landingDisplayFont.variable} min-h-screen bg-background text-foreground antialiased font-sans`}
      >
        <Providers>{children}</Providers>
        <Toaster />
        <WebVitals />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
