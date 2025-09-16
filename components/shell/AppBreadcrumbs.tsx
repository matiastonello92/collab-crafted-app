"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";

function formatLabel(segment: string) {
  return segment
    .replace(/\?.*$/, "")
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, char => char.toUpperCase()) || "Dashboard";
}

export function AppBreadcrumbs() {
  const pathname = usePathname();
  const segments = pathname?.split("?")[0].split("/").filter(Boolean) ?? [];

  const crumbs = segments.map((segment, index) => {
    const href = `/${segments.slice(0, index + 1).join("/")}`;
    return { href, label: formatLabel(segment) };
  });

  if (crumbs.length === 0) {
    return (
      <nav aria-label="Percorso" className="hidden text-sm font-medium text-muted-foreground sm:flex sm:items-center sm:gap-2">
        <span className="text-foreground">Dashboard</span>
      </nav>
    );
  }

  return (
    <nav aria-label="Percorso" className="hidden text-sm font-medium text-muted-foreground sm:flex sm:items-center sm:gap-2">
      <Link href="/" className="text-foreground transition-colors hover:text-primary">
        Home
      </Link>
      {crumbs.map(crumb => (
        <div key={crumb.href} className="flex items-center gap-2">
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
          <Link href={crumb.href} className="text-muted-foreground transition-colors hover:text-primary">
            {crumb.label}
          </Link>
        </div>
      ))}
    </nav>
  );
}
