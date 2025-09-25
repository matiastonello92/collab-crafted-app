"use client";
import { ReactNode } from "react";
import { useIsClient } from "@/lib/hydration/HydrationToolkit";

export default function ClientOnly({
  children,
  fallback = null,
}: { children: ReactNode; fallback?: ReactNode }) {
  const isClient = useIsClient();
  if (!isClient) return <>{fallback}</>;
  return <>{children}</>;
}