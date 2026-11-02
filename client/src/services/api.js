/**
 * Centralized API client. All HTTP calls go through here (frontend convention).
 */
const BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}/api${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      message = body?.error?.message || message;
    } catch {
      // ignore parse errors
    }
    throw new Error(message);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  // Health / status
  getHealth: () => request('/health'),

  // Profile
  getProfile: () => request('/profile'),
  updateProfile: (data) => request('/profile', { method: 'PUT', body: JSON.stringify(data) }),
  uploadResume: async (file) => {
    const form = new FormData();
    form.append('resume', file);
    const res = await fetch(`${BASE}/api/profile/resume`, { method: 'POST', body: form });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.error?.message || `HTTP ${res.status}`);
    }
    return res.json();
  },

  // Preferences
  getPreferences: () => request('/preferences'),
  updatePreferences: (data) =>
    request('/preferences', { method: 'PUT', body: JSON.stringify(data) }),

  // Sources (to detect whether any official API source is connected)
  getSources: () => request('/sources'),

  // Fetch from connected (credentialed) sources — e.g. LinkedIn official API
  runFetch: () => request('/fetch/run', { method: 'POST' }),

  // Listings
  getListings: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== '' && v !== undefined)
    ).toString();
    return request(`/listings${qs ? `?${qs}` : ''}`);
  },
  getListing: (id) => request(`/listings/${id}`),
  setListingStatus: (id, status) =>
    request(`/listings/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  tailorListing: (id) => request(`/listings/${id}/tailor`, { method: 'POST' }),

  // LinkedIn search (builds a URL the user opens in their own browser; no scraping)
  getLinkedInFilters: () => request('/listings/linkedin-filters'),
  buildSearch: (query) =>
    request('/listings/build-search', { method: 'POST', body: JSON.stringify(query) }),

  // Saved search presets
  getPresets: () => request('/search-presets'),
  createPreset: (data) =>
    request('/search-presets', { method: 'POST', body: JSON.stringify(data) }),
  deletePreset: (id) => request(`/search-presets/${id}`, { method: 'DELETE' }),
  saveManualListing: (data) =>
    request('/listings/manual', { method: 'POST', body: JSON.stringify(data) }),

};
