import type { Metadata } from "next";
import "./globals.css"; // unico import globale
import { ThemeProvider } from "next-themes";
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
      <body className={cn("min-h-screen bg-background text-foreground antialiased", inter.className)}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange={false}
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}