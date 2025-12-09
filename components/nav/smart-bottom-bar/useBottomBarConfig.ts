'use client';

import { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { usePermissions, hasPermission } from '@/hooks/usePermissions';
import { useUsageTracking } from './useUsageTracking';
import {
  HOME_LINK,
  MODULE_BOTTOM_BAR_CONFIG,
  DEFAULT_CONTEXTUAL_LINKS,
  ALL_TRACKABLE_LINKS,
  BottomBarLink,
} from './bottomBarRegistry';

export function useBottomBarConfig() {
  const pathname = usePathname();
  const { permissions, isAdmin, isLoading } = usePermissions();
  const { trackClick, getSmartSuggestion } = useUsageTracking();

  const config = useMemo(() => {
    // Find matching module config
    const moduleKey = Object.keys(MODULE_BOTTOM_BAR_CONFIG)
      .filter(key => pathname?.startsWith(key))
      .sort((a, b) => b.length - a.length)[0]; // Most specific match

    const contextualLinks = moduleKey 
      ? MODULE_BOTTOM_BAR_CONFIG[moduleKey] 
      : DEFAULT_CONTEXTUAL_LINKS;

    // Filter by permissions
    const filterByPermission = (link: BottomBarLink): boolean => {
      if (link.adminOnly && !isAdmin) return false;
      if (!link.permission) return true;
      return hasPermission(permissions, link.permission);
    };

    // Get allowed contextual links (max 2)
    const allowedContextual = contextualLinks
      .filter(filterByPermission)
      .slice(0, 2);

    // Get all allowed links for smart suggestion
    const allowedTrackableIds = ALL_TRACKABLE_LINKS
      .filter(filterByPermission)
      .map(l => l.id);

    // IDs to exclude from smart suggestion (home + contextual)
    const excludeFromSmart = [
      HOME_LINK.id,
      ...allowedContextual.map(l => l.id),
    ];

    // Get smart suggestion
    const smartId = getSmartSuggestion(excludeFromSmart, allowedTrackableIds);
    const smartLink = smartId 
      ? ALL_TRACKABLE_LINKS.find(l => l.id === smartId) 
      : null;

    // If we don't have 2 contextual links, fill with defaults
    while (allowedContextual.length < 2) {
      const fallback = DEFAULT_CONTEXTUAL_LINKS.find(
        l => !allowedContextual.some(c => c.id === l.id) && filterByPermission(l)
      );
      if (fallback) {
        allowedContextual.push(fallback);
      } else {
        break;
      }
    }

    // Build final items array: [Home, Contextual1, Contextual2, Smart]
    const items: BottomBarLink[] = [HOME_LINK, ...allowedContextual];
    
    if (smartLink && !items.some(i => i.id === smartLink.id)) {
      items.push({ ...smartLink, labelKey: 'bottomBar.smart' });
    }

    return { items, smartId };
  }, [pathname, permissions, isAdmin, getSmartSuggestion]);

  return {
    items: config.items,
    smartId: config.smartId,
    trackClick,
    isLoading,
    currentPath: pathname,
  };
}
