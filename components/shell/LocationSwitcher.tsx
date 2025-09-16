"use client";

import * as React from "react";
import { MapPin } from "lucide-react";

import { Label } from "@/components/ui/label";

interface LocationOption {
  id: string;
  name: string;
}

interface LocationSwitcherProps {
  locations: LocationOption[];
  activeLocationId: string | null;
  pending: boolean;
  errorMessage?: string;
  onChange: (id: string) => void;
}

export function LocationSwitcher({ locations, activeLocationId, pending, errorMessage, onChange }: LocationSwitcherProps) {
  const hasLocations = locations.length > 0;

  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor="location-switcher" className="sr-only">
        Seleziona sede
      </Label>
      <div className="flex items-center gap-2 rounded-lg border border-input/80 bg-card px-3 py-2 shadow-sm">
        <MapPin className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        {hasLocations ? (
          <select
            id="location-switcher"
            className="min-w-[9rem] bg-transparent text-sm text-foreground outline-none"
            value={activeLocationId ?? locations[0]?.id ?? ""}
            onChange={event => onChange(event.target.value)}
            disabled={pending}
            aria-describedby={errorMessage ? "location-switcher-error" : undefined}
          >
            {locations.map(location => (
              <option key={location.id} value={location.id} className="bg-card text-foreground">
                {location.name}
              </option>
            ))}
          </select>
        ) : (
          <span className="text-sm text-muted-foreground">Nessuna sede assegnata</span>
        )}
      </div>
      {errorMessage ? (
        <span id="location-switcher-error" className="text-xs text-warning">
          {errorMessage}
        </span>
      ) : null}
    </div>
  );
}
