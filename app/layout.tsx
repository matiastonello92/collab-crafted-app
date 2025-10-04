import type { Metadata } from "next";
import "./globals.css";
import { QueryProvider, ThemeProvider } from "@/lib/providers";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { Inter } from "next/font/google";

export const metadata: Metadata = {
  title: "Klyra",
  description: "Klyra SaaS",
};

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" suppressHydrationWarning>
      <body className={cn("min-h-[100svh] bg-background text-foreground antialiased", inter.className)}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <LocaleProvider initialLocale="it">
            <QueryProvider>
              {children}
            </QueryProvider>
          </LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}