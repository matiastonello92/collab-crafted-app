import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Bug,
  Building2,
  Clock3,
  Home,
  MapPin,
  Shield,
  Settings,
  Users,
} from "lucide-react";

export type NavigationItem = {
  name: string;
  href: string;
  icon: LucideIcon;
  permission?: string | null;
  adminOnly?: boolean;
  description?: string;
};

export const appNavigation: NavigationItem[] = [
  { name: "Dashboard", href: "/", icon: Home, permission: null, description: "Panoramica principale" },
  { name: "Amministrazione", href: "/admin/users", icon: Users, permission: "manage_users", description: "Gestisci utenti e permessi" },
  { name: "Inviti", href: "/admin/invitations", icon: Users, permission: "*", adminOnly: true, description: "Invia e monitora gli inviti" },
  { name: "Locations", href: "/admin/locations", icon: MapPin, permission: "locations:view", adminOnly: true, description: "Gestisci sedi e indirizzi" },
  { name: "Console Admin", href: "/admin/settings", icon: Settings, permission: "*", adminOnly: true, description: "Configurazioni organizzative" },
  { name: "QA & Debug", href: "/qa", icon: Bug, permission: "*", description: "Strumenti di diagnostica" },
  { name: "Impostazioni", href: "/settings", icon: Settings, permission: "view_settings", description: "Preferenze personali" },
];

export const platformNavigation: NavigationItem[] = [
  { name: "Platform Dashboard", href: "/platform/dashboard", icon: Activity, permission: null, description: "Metriche globali" },
  { name: "Tenants", href: "/platform", icon: Building2, permission: null, description: "Organizzazioni e piani" },
  { name: "Audit & Sicurezza", href: "/platform/access-denied", icon: Shield, permission: null, description: "Verifiche e controlli" },
  { name: "Task di Supervisione", href: "/platform", icon: Clock3, permission: null, description: "Attività recenti" },
];
