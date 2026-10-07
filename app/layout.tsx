import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Serif, IBM_Plex_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { AI_DESCRIPTION, BROWSER_TAB_TITLE } from "@/config";
import { SiteHeader } from "@/components/shell/site-header";
import { SiteFooter } from "@/components/shell/site-footer";
import { AgentPanel } from "@/components/agent/agent-panel";
import "./globals.css";
import "katex/dist/katex.min.css";
import "streamdown/styles.css";

const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const plexSerif = IBM_Plex_Serif({
  variable: "--font-plex-serif",
  subsets: ["latin"],
  weight: ["400", "600"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: { default: BROWSER_TAB_TITLE, template: `%s · ${BROWSER_TAB_TITLE}` },
  description: AI_DESCRIPTION,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-IN">
      <body className={`${plexSans.variable} ${plexSerif.variable} ${plexMono.variable} antialiased`}>
        <SiteHeader />
        <main className="mx-auto w-full max-w-[1200px] px-4 pb-16 pt-6 sm:px-6 sm:pt-8">{children}</main>
        <SiteFooter />
        <AgentPanel />
        <Toaster position="bottom-center" />
      </body>
    </html>
  );
}
