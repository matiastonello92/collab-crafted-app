export interface RecentSearchItem {
  id: string;
  type: 'user' | 'shift' | 'recipe' | 'inventory' | 'financial' | 'location' | 'navigation';
  title: string;
  subtitle?: string;
  url: string;
  timestamp: number;
}

const STORAGE_KEY = 'recent_searches';
const MAX_RECENT_ITEMS = 10;

export function getRecentSearches(): RecentSearchItem[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    
    const items: RecentSearchItem[] = JSON.parse(stored);
    // Filter out items older than 30 days
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    return items.filter(item => item.timestamp > thirtyDaysAgo);
  } catch (error) {
    console.error('Error loading recent searches:', error);
    return [];
  }
}

export function addRecentSearch(item: Omit<RecentSearchItem, 'timestamp'>): void {
  if (typeof window === 'undefined') return;
  
  try {
    const recent = getRecentSearches();
    
    // Remove duplicates (same id and type)
    const filtered = recent.filter(r => !(r.id === item.id && r.type === item.type));
    
    // Add new item at the beginning
    const updated: RecentSearchItem[] = [
      { ...item, timestamp: Date.now() },
      ...filtered,
    ].slice(0, MAX_RECENT_ITEMS);
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Error saving recent search:', error);
  }
}

export function clearRecentSearches(): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing recent searches:', error);
  }
}

export function removeRecentSearch(id: string, type: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    const recent = getRecentSearches();
    const filtered = recent.filter(r => !(r.id === id && r.type === type));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error removing recent search:', error);
  }
}
