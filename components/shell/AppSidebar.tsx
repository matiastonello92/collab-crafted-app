"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppStore } from "@/lib/store";
import { can } from "@/lib/permissions";
import { createSupabaseBrowserClient } from "@/utils/supabase/client";
import { isAdminFromClaims } from "@/lib/admin/claims";
import { appNavigation, platformNavigation, type NavigationItem } from "./navigation";
import { cn } from "@/lib/utils";

interface AppSidebarProps {
  variant: "app" | "platform";
}

export function AppSidebar({ variant }: AppSidebarProps) {
  const [collapsed, setCollapsed] = React.useState(false);
  const [isAdminClaims, setIsAdminClaims] = React.useState(false);
  const pathname = usePathname();
  const { permissions, context } = useAppStore();
  const permissionsLoading = useAppStore(state => state.permissionsLoading);

  React.useEffect(() => {
    let active = true;
    async function readAdminClaims() {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data } = await supabase.auth.getUser();
        if (!active) return;
        setIsAdminClaims(isAdminFromClaims(data.user as any));
      } catch {
        if (active) setIsAdminClaims(false);
      }
    }

    void readAdminClaims();
    return () => {
      active = false;
    };
  }, []);

  const navigation = variant === "platform" ? platformNavigation : appNavigation;

  const resolvedNavigation = React.useMemo(() => {
    const isSuperAdmin = isAdminClaims || can(permissions, "*");
    return navigation.map(item => ({
      ...item,
      canAccess:
        isSuperAdmin || !item.permission || item.permission === null
          ? true
          : Array.isArray(item.permission)
            ? item.permission.some(permission => can(permissions, permission))
            : can(permissions, item.permission),
      href: item.name === "Locations" && !isSuperAdmin && item.permission === "locations:view"
        ? "/locations/manage"
        : item.href,
    }));
  }, [navigation, permissions, isAdminClaims]);

  const sidebarClasses = cn(
    "hidden border-r border-border/70 bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60 transition-[width] duration-200 lg:flex lg:flex-col",
    collapsed ? "lg:w-20" : "lg:w-72"
  );

  return (
    <aside className={sidebarClasses}>
      <div className="flex flex-col gap-2 px-4 py-5">
        <div className="flex items-center justify-between gap-2">
          {!collapsed && (
            <div className="flex items-center gap-3">
              <Image src="/brand/klyra-icon.svg" alt="Klyra" width={28} height={28} className="h-7 w-7" />
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-foreground">
                  {variant === "platform" ? "Platform" : "Klyra"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {variant === "platform" ? "Supervisione" : "Workforce"}
                </span>
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(prev => !prev)}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            aria-label={collapsed ? "Espandi barra laterale" : "Comprimi barra laterale"}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
        {!collapsed && context.location_name ? (
          <Badge variant="secondary" className="w-full justify-center bg-secondary/80 text-xs text-secondary-foreground">
            {context.location_name}
          </Badge>
        ) : null}
      </div>

      <nav className="flex-1 space-y-1 px-3 pb-6">
        {permissionsLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-9 w-full" />
            ))}
          </div>
        ) : (
          resolvedNavigation.map(item => (
            <SidebarLink key={item.href} item={item} pathname={pathname} collapsed={collapsed} />
          ))
        )}
      </nav>

      <div className="mt-auto border-t border-border/70 px-4 py-4">
        {collapsed ? (
          <div className="flex justify-center">
            <span className="h-2 w-2 rounded-full bg-success" aria-hidden="true" />
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-success" aria-hidden="true" />
            Sistema attivo
          </div>
        )}
      </div>
    </aside>
  );
}

interface SidebarLinkProps {
  item: NavigationItem & { canAccess: boolean; href: string };
  pathname: string | null;
  collapsed: boolean;
}

function SidebarLink({ item, pathname, collapsed }: SidebarLinkProps) {
  const isActive = pathname === item.href;
  const content = (
    <span
      className={cn(
        "flex flex-1 items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
        item.canAccess
          ? "text-muted-foreground hover:bg-accent/70 hover:text-accent-foreground"
          : "cursor-not-allowed text-muted-foreground/60",
        isActive && item.canAccess ? "bg-accent text-accent-foreground" : undefined
      )}
    >
      <item.icon className="h-4 w-4" />
      {!collapsed && <span className="flex-1 truncate">{item.name}</span>}
      {!collapsed && !item.canAccess && <Badge variant="outline" className="text-[10px]">Bloccato</Badge>}
    </span>
  );

  if (!item.canAccess) {
    return (
      <div className="opacity-75" aria-disabled>
        {content}
      </div>
    );
  }

  return (
    <Link href={item.href} className="block">
      {content}
    </Link>
  );
}
