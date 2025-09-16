"use client";

import * as React from "react";

export function ThemeDiagnosticsClient() {
  const [bodyClassName, setBodyClassName] = React.useState("");

  React.useEffect(() => {
    const updateClassName = () => {
      setBodyClassName(document.body.className || "(vuoto)");
    };

    updateClassName();

    const observer = new MutationObserver(updateClassName);
    observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="rounded-lg border border-border/70 bg-card/80 p-4 text-sm">
      <div className="flex items-center gap-2 text-muted-foreground">
        <span className="font-medium text-foreground">body.className</span>
        <code className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">{bodyClassName}</code>
      </div>
    </div>
  );
}
