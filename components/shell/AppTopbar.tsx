import { getActiveLocationServer } from "@/lib/server/activeLocation";
import { setActiveLocationAction } from "@/app/actions/active-location";
import { AppTopbarClient } from "./AppTopbarClient";

interface AppTopbarProps {
  variant: "app" | "platform";
}

export async function AppTopbar({ variant }: AppTopbarProps) {
  const { active, locations, persisted, meta } = await getActiveLocationServer();

  const errorMessage =
    meta?.error === "memberships"
      ? "Impossibile leggere le assegnazioni"
      : meta?.error === "locations"
        ? "Impossibile leggere le sedi"
        : meta?.error === "fatal"
          ? "Errore inatteso"
          : undefined;

  return (
    <AppTopbarClient
      variant={variant}
      locations={locations}
      activeLocationId={active?.id ?? null}
      persisted={persisted}
      errorMessage={errorMessage}
      setActiveLocation={setActiveLocationAction}
    />
  );
}
