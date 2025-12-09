'use client';

import { useCallback, useEffect, useState } from 'react';

interface LinkUsage {
  count: number;
  lastUsed: number;
  byHour: Record<number, number>; // hour (0-23) -> count
}

interface UsageData {
  [linkId: string]: LinkUsage;
}

const STORAGE_KEY = 'klyra_nav_usage';

function getStoredUsage(): UsageData {
  if (typeof window === 'undefined') return {};
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function saveUsage(data: UsageData) {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage full or unavailable
  }
}

export function useUsageTracking() {
  const [usageData, setUsageData] = useState<UsageData>({});

  // Load from localStorage on mount
  useEffect(() => {
    setUsageData(getStoredUsage());
  }, []);

  const trackClick = useCallback((linkId: string) => {
    const now = Date.now();
    const hour = new Date().getHours();

    setUsageData(prev => {
      const current = prev[linkId] || { count: 0, lastUsed: 0, byHour: {} };
      
      const updated: UsageData = {
        ...prev,
        [linkId]: {
          count: current.count + 1,
          lastUsed: now,
          byHour: {
            ...current.byHour,
            [hour]: (current.byHour[hour] || 0) + 1,
          },
        },
      };

      saveUsage(updated);
      return updated;
    });
  }, []);

  const getSmartSuggestion = useCallback((
    excludeIds: string[],
    allowedIds: string[]
  ): string | null => {
    const hour = new Date().getHours();
    
    // Filter to allowed links that aren't excluded
    const candidates = allowedIds.filter(id => !excludeIds.includes(id));
    
    if (candidates.length === 0) return null;

    // Score each candidate
    const scored = candidates.map(id => {
      const usage = usageData[id];
      if (!usage) return { id, score: 0 };

      // Weights for scoring
      const totalWeight = 0.4;
      const hourWeight = 0.4;
      const recencyWeight = 0.2;

      // Total count score (normalized)
      const maxCount = Math.max(...Object.values(usageData).map(u => u.count), 1);
      const totalScore = (usage.count / maxCount) * totalWeight;

      // Hour-based score (usage at current hour)
      const maxHourCount = Math.max(...Object.values(usage.byHour), 1);
      const hourScore = ((usage.byHour[hour] || 0) / maxHourCount) * hourWeight;

      // Recency score (decay over 7 days)
      const daysSinceUse = (Date.now() - usage.lastUsed) / (1000 * 60 * 60 * 24);
      const recencyScore = Math.max(0, 1 - daysSinceUse / 7) * recencyWeight;

      return { id, score: totalScore + hourScore + recencyScore };
    });

    // Sort by score and return the best
    scored.sort((a, b) => b.score - a.score);
    
    return scored[0]?.score > 0 ? scored[0].id : candidates[0] || null;
  }, [usageData]);

  const getTopLinks = useCallback((n: number, excludeIds: string[] = []): string[] => {
    const entries = Object.entries(usageData)
      .filter(([id]) => !excludeIds.includes(id))
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, n)
      .map(([id]) => id);
    
    return entries;
  }, [usageData]);

  return { trackClick, getSmartSuggestion, getTopLinks, usageData };
}
