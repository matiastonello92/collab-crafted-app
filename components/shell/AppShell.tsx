import { Suspense } from "react";

import { cn } from "@/lib/utils";
import { AppSidebar } from "./AppSidebar";
import { AppTopbar } from "./AppTopbar";

interface AppShellProps {
  children: React.ReactNode;
  variant?: "app" | "platform";
  contentClassName?: string;
}

export function AppShell({ children, variant = "app", contentClassName }: AppShellProps) {
  return (
    <div className="min-h-[100svh] bg-background text-foreground">
      <div className="flex min-h-[100svh] w-full">
        <Suspense fallback={<SidebarFallback />}>
          <AppSidebar variant={variant} />
        </Suspense>
        <div className="flex min-h-[100svh] flex-1 flex-col">
          <Suspense fallback={<TopbarFallback />}>
            <AppTopbar variant={variant} />
          </Suspense>
          <main className="flex-1 overflow-y-auto">
            <div className={cn("mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8", contentClassName)}>
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

function SidebarFallback() {
  return (
    <div className="hidden w-72 border-r border-border/70 bg-card/80 px-4 py-6 lg:block">
      <div className="h-6 w-32 animate-pulse rounded bg-muted" />
      <div className="mt-6 space-y-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="h-10 w-full animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    </div>
  );
}

function TopbarFallback() {
  return (
    <div className="border-b border-border/70 bg-background/80 px-4 py-4 sm:px-6 lg:px-8">
      <div className="h-10 w-full max-w-4xl animate-pulse rounded-lg bg-muted/70" />
    </div>
  );
}
