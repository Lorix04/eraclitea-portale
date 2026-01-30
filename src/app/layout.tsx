import "./globals.css";
import type { Metadata } from "next";
import { Sora, Source_Sans_3 } from "next/font/google";
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

export const metadata: Metadata = {
  title: {
    default: "Portale Formazione",
    template: "%s | Portale Formazione",
  },
  description: "Portale per la gestione della formazione aziendale",
  keywords: ["formazione", "corsi", "attestati", "sicurezza"],
  authors: [{ name: "Ente Formazione" }],
  robots: {
    index: false,
    follow: false,
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
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
        className={`${bodyFont.variable} ${displayFont.variable} min-h-screen bg-background text-foreground antialiased font-sans`}
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
