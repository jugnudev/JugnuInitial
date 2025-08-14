// Unified API endpoints configuration
export const ENDPOINTS = {
  // Admin endpoints (use aliases that forward to spotlight)
  ADMIN: {
    LOGIN: '/api/admin/login',
    SESSION: '/api/admin/session',
    LOGOUT: '/api/admin/logout',
    CAMPAIGNS: '/api/admin/campaigns',
    PORTAL_TOKENS: '/api/admin/portal-tokens',
    SELFTEST: '/api/admin/selftest',
  },
  
  // Spotlight endpoints (direct access)
  SPOTLIGHT: {
    ACTIVE: '/api/spotlight/active',
    PORTAL: '/api/spotlight/portal',
    LEADS: '/api/spotlight/leads',
    ADMIN: {
      CAMPAIGNS: '/api/spotlight/admin/campaigns',
      CREATIVES: '/api/spotlight/admin/creatives',
      METRICS: '/api/spotlight/admin/metrics',
      PORTAL_TOKENS: '/api/spotlight/admin/portal-tokens',
      LEADS: '/api/spotlight/admin/leads',
      SELFTEST: '/api/spotlight/admin/selftest',
    }
  },
  
  // Community endpoints
  COMMUNITY: {
    WEEKLY: '/api/community/weekly',
    EVENTS: '/api/community/events',
  }
} as const;

// Helper function for building URLs with query parameters
export const buildUrl = (endpoint: string, params?: Record<string, string | number | boolean>) => {
  if (!params) return endpoint;
  
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value));
    }
  });
  
  const queryString = searchParams.toString();
  return queryString ? `${endpoint}?${queryString}` : endpoint;
};

// Helper function for admin API calls with x-admin-key header
export const adminFetch = async (endpoint: string, options: RequestInit = {}) => {
  const adminKey = localStorage.getItem('adminKey') || sessionStorage.getItem('adminKey');
  
  return fetch(endpoint, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-admin-key': adminKey || '',
      ...options.headers,
    },
  });
};