"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import * as React from "react";

import { CommandMenu } from "./CommandMenu";
import { LocationSwitcher } from "./LocationSwitcher";
import { OrgSwitcher } from "./OrgSwitcher";
import { AppBreadcrumbs } from "./AppBreadcrumbs";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { UserDropdown } from "@/components/nav/UserDropdown";
import { useAppStore } from "@/lib/store";
import { useEffectivePermissions } from "@/hooks/useEffectivePermissions";
import { can } from "@/lib/permissions";
import { appNavigation, platformNavigation } from "./navigation";

interface AppTopbarClientProps {
  variant: "app" | "platform";
  locations: { id: string; name: string }[];
  activeLocationId: string | null;
  persisted: boolean;
  errorMessage?: string;
  setActiveLocation: (id?: string | null) => Promise<void>;
}

export function AppTopbarClient({
  variant,
  locations,
  activeLocationId,
  persisted,
  errorMessage,
  setActiveLocation,
}: AppTopbarClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const setContext = useAppStore(state => state.setContext);
  const permissions = useAppStore(state => state.permissions);
  const permissionsLoading = useAppStore(state => state.permissionsLoading);

  useEffectivePermissions();

  React.useEffect(() => {
    const active = locations.find(location => location.id === activeLocationId) ?? null;
    const previous = useAppStore.getState().context;
    setContext({
      ...previous,
      location_id: active?.id ?? null,
      location_name: active?.name ?? null,
    });
  }, [locations, activeLocationId, setContext]);

  React.useEffect(() => {
    if (!persisted && activeLocationId) {
      startTransition(async () => {
        await setActiveLocation(activeLocationId);
      });
    }
  }, [activeLocationId, persisted, setActiveLocation]);

  const handleLocationChange = (id: string) => {
    startTransition(async () => {
      await setActiveLocation(id);
      router.refresh();
    });
  };

  const navigation = variant === "platform" ? platformNavigation : appNavigation;
  const accessibleNavigation = React.useMemo(
    () =>
      navigation.filter(item => {
        if (!item.permission || item.permission === null) {
          return true;
        }
        if (item.permission === "*") {
          return can(permissions, "*");
        }
        if (Array.isArray(item.permission)) {
          return item.permission.some(permission => can(permissions, permission));
        }
        return can(permissions, item.permission);
      }),
    [navigation, permissions]
  );

  const branding = variant === "platform"
    ? { title: "Klyra Platform", subtitle: "Console centralizzata" }
    : { title: "Klyra", subtitle: "Gestione del personale" };

  const isBusy = permissionsLoading || isPending;

  return (
    <div className="border-b border-border/70 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 flex-1 items-center gap-4">
            <div className="flex items-center gap-3">
              <Image src="/brand/klyra-icon.svg" alt="Klyra" width={28} height={28} className="h-7 w-7" priority />
              <div className="flex flex-col">
                <span className="text-base font-semibold text-foreground">{branding.title}</span>
                <span className="text-xs text-muted-foreground">{branding.subtitle}</span>
              </div>
            </div>
            <AppBreadcrumbs />
          </div>
          <div className="flex flex-wrap items-center justify-end gap-3">
            <CommandMenu items={accessibleNavigation} />
            <OrgSwitcher />
            <LocationSwitcher
              locations={locations}
              activeLocationId={activeLocationId}
              pending={isBusy}
              errorMessage={errorMessage}
              onChange={handleLocationChange}
            />
            <ThemeToggle />
            <UserDropdown />
          </div>
        </div>
        {errorMessage ? (
          <p className="text-xs text-warning" role="status">
            {errorMessage}
          </p>
        ) : null}
      </div>
    </div>
  );
}
