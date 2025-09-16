import type { Metadata } from "next";
import "./globals.css";
import { AppProviders, ThemeProvider } from "@/lib/providers";
import { Inter } from "next/font/google";

export const metadata: Metadata = {
  title: "Klyra",
  description: "Klyra SaaS",
};

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" suppressHydrationWarning>
      <body className={`${inter.className} min-h-[100svh] bg-background text-foreground antialiased`}>
        <ThemeProvider>
          <AppProviders>{children}</AppProviders>
        </ThemeProvider>
      </body>
    </html>
  );
}