import { useEffect, useState } from "react";

export function useIsClient(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

export function ssrSafeNow(): number {
  return typeof window === "undefined" ? 0 : Date.now();
}

export function ssrGuard<T>(value: T, fallback: T): T {
  return typeof window === "undefined" ? fallback : value;
}