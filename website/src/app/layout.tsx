import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Archivo, IBM_Plex_Mono } from "next/font/google";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { StructuredData } from "@/components/StructuredData";
import { SITE_URL } from "@/lib/links";
import "./globals.css";
import "./home.css";

const archivo = Archivo({
  subsets: ["latin"],
  weight: ["400", "600", "800"],
  variable: "--font-archivo",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
  display: "swap",
});

const TITLE = "coeditHTML";

const DESCRIPTION =
  "Share and collaborate on standalone HTML files in real time. Leave comments, drop sticky notes, and edit files directly in your browser.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: TITLE, template: "%s · coeditHTML" },
  description: DESCRIPTION,
  applicationName: "coeditHTML",
  authors: [{ name: "Mason Levy" }],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "coeditHTML",
    locale: "en_US",
    url: SITE_URL,
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-snippet": -1 },
  },
};

export const viewport: Viewport = {
  themeColor: "#e9eae4",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${archivo.variable} ${plexMono.variable}`}>
      <body>
        <SiteHeader />
        <main>{children}</main>
        <SiteFooter />
        <StructuredData />
      </body>
    </html>
  );
}
