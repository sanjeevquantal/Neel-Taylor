/**
 * Shared cache utility with expiration and user-specific keys
 */

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface CachedData<T> {
  data: T;
  timestamp: number;
  userId?: number;
}

/**
 * Get the current user ID from localStorage or token
 */
export const getUserId = (): number => {
  try {
    // Try to get from localStorage first
    const stored = localStorage.getItem('campaigner-user-id');
    if (stored) {
      const userId = Number(stored);
      if (Number.isFinite(userId) && userId > 0) {
        return userId;
      }
    }
    
    // Try to extract from JWT token
    const token = localStorage.getItem('auth_token');
    if (token) {
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]));
          if (payload.user_id && Number.isFinite(payload.user_id)) {
            const userId = Number(payload.user_id);
            // Cache it for future use
            localStorage.setItem('campaigner-user-id', String(userId));
            return userId;
          }
        }
      } catch {
        // Ignore token parsing errors
      }
    }
    
    // Default fallback
    return 1;
  } catch {
    return 1;
  }
};

/**
 * Generate a user-specific cache key
 */
export const getUserCacheKey = (baseKey: string, userId?: number): string => {
  const uid = userId ?? getUserId();
  return `${baseKey}-${uid}`;
};

/**
 * Read from cache with expiration check
 */
export const readCache = <T,>(baseKey: string, userId?: number): T | undefined => {
  try {
    const key = getUserCacheKey(baseKey, userId);
    const raw = localStorage.getItem(key);
    if (!raw) return undefined;
    
    const cached: CachedData<T> = JSON.parse(raw);
    
    // Check expiration
    const now = Date.now();
    if (cached.timestamp && (now - cached.timestamp) > CACHE_TTL) {
      // Cache expired, remove it
      localStorage.removeItem(key);
      return undefined;
    }
    
    // Verify user ID matches (security check)
    const currentUserId = getUserId();
    if (cached.userId && cached.userId !== currentUserId) {
      // User ID mismatch, clear cache
      localStorage.removeItem(key);
      return undefined;
    }
    
    return cached.data;
  } catch (err) {
    console.error('Failed to read cache', err);
    return undefined;
  }
};

/**
 * Write to cache with timestamp and user ID
 */
export const writeCache = <T,>(baseKey: string, value: T, userId?: number): void => {
  try {
    const key = getUserCacheKey(baseKey, userId);
    const uid = userId ?? getUserId();
    const cached: CachedData<T> = {
      data: value,
      timestamp: Date.now(),
      userId: uid,
    };
    localStorage.setItem(key, JSON.stringify(cached));
  } catch (err) {
    console.error('Failed to write cache', err);
  }
};

/**
 * Clear cache for a specific key (all users) or current user
 */
export const clearCache = (baseKey: string, userId?: number): void => {
  try {
    if (userId !== undefined) {
      // Clear specific user's cache
      const key = getUserCacheKey(baseKey, userId);
      localStorage.removeItem(key);
    } else {
      // Clear all users' cache for this key
      const currentUserId = getUserId();
      const key = getUserCacheKey(baseKey, currentUserId);
      localStorage.removeItem(key);
      
      // Also try to clear common user IDs (1-100) to be thorough
      for (let i = 1; i <= 100; i++) {
        const userKey = getUserCacheKey(baseKey, i);
        localStorage.removeItem(userKey);
      }
    }
  } catch (err) {
    console.error('Failed to clear cache', err);
  }
};

/**
 * Clear all sidebar-related caches for current user
 */
export const clearSidebarCaches = (userId?: number): void => {
  clearCache(CACHE_KEYS.CONVERSATIONS, userId);
  clearCache(CACHE_KEYS.CAMPAIGNS, userId);
  clearCache(CACHE_KEYS.CONVERSATIONS_PAGE, userId);
  clearCache(CACHE_KEYS.DASHBOARD, userId);
};

/**
 * Dispatch a cache invalidation event
 * Components can listen to this event to refresh their data
 */
export const invalidateCache = (cacheType: 'conversations' | 'campaigns' | 'dashboard' | 'all'): void => {
  window.dispatchEvent(new CustomEvent('cache-invalidate', { detail: { type: cacheType } }));
};

/**
 * Cache key constants
 */
export const CACHE_KEYS = {
  CONVERSATIONS: 'campaigner-sidebar-conversations',
  CAMPAIGNS: 'campaigner-sidebar-campaigns',
  CONVERSATIONS_PAGE: 'campaigner-conversations-page',
  DASHBOARD: 'campaigner-dashboard',
  CREDITS: 'campaigner-credits',
} as const;

