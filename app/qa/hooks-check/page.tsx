"use client";
import ClientOnly from "@/components/ClientOnly";
import { useState } from "react";

export default function HooksCheckPage() {
  const [copied, setCopied] = useState<string>("");

  const tryCopy = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText("test");
        setCopied("OK: clipboard");
      } else {
        setCopied("Fallback: clipboard non disponibile");
      }
    } catch {
      setCopied("Errore: clipboard");
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <h1>QA — Hooks & Hydration</h1>
      <ClientOnly fallback={<p>Loading (SSR placeholder)...</p>}>
        <button onClick={tryCopy}>Prova clipboard</button>
        <p data-testid="clipboard-status">{copied}</p>
        <p>Client time: {new Date().toISOString()}</p>
      </ClientOnly>
    </div>
  );
}