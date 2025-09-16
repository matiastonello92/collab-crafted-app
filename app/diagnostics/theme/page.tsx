import { ThemeDiagnosticsClient } from "./ThemeDiagnosticsClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const TOKENS: Array<{ label: string; variable: string; description: string }> = [
  { label: "Background", variable: "--background", description: "Colore principale di sfondo" },
  { label: "Foreground", variable: "--foreground", description: "Colore principale del testo" },
  { label: "Card", variable: "--card", description: "Sfondo delle card" },
  { label: "Muted", variable: "--muted", description: "Sfondo attenuato" },
  { label: "Primary", variable: "--primary", description: "Colore del brand" },
  { label: "Primary Foreground", variable: "--primary-foreground", description: "Testo su superfici primary" },
  { label: "Secondary", variable: "--secondary", description: "Superfici secondarie" },
  { label: "Accent", variable: "--accent", description: "Colori di enfasi" },
  { label: "Success", variable: "--success", description: "Messaggi di successo" },
  { label: "Warning", variable: "--warning", description: "Messaggi di avviso" },
  { label: "Destructive", variable: "--destructive", description: "Messaggi di errore" },
  { label: "Info", variable: "--info", description: "Messaggi informativi" },
  { label: "Border", variable: "--border", description: "Colore dei bordi" },
  { label: "Ring", variable: "--ring", description: "Focus ring" },
];

export const metadata = {
  title: "Theme Diagnostics",
  description: "Visualizza i token di tema attivi",
};

export default function ThemeDiagnosticsPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-foreground">Theme Diagnostics</h1>
        <p className="text-sm text-muted-foreground">
          Questa pagina aiuta a verificare i token di design attivi e la classe applicata al body.
        </p>
      </div>

      <ThemeDiagnosticsClient />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {TOKENS.map(token => (
          <Card key={token.variable} className="border border-border/70 bg-card/80 shadow-none">
            <CardHeader>
              <CardTitle className="text-base">{token.label}</CardTitle>
              <CardDescription>{token.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div
                className="h-16 w-full rounded-lg border border-border/60"
                style={{ background: `hsl(var(${token.variable}))` }}
              />
              <code className="block text-xs text-muted-foreground">{token.variable}</code>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
