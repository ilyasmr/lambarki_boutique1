// Central API client — all data goes through /api/* (Express → Neon PostgreSQL)
const getApiBase = () => {
  const custom = localStorage.getItem('API_URL');
  if (custom) return custom;
  
  const protocol = window.location.protocol;
  const isStandalone = protocol === 'file:' || protocol.startsWith('capacitor') || window.location.hostname === 'localhost';
  
  // If running in local dev mode (Vite port 3000), keep using local api proxy "/api"
  if (window.location.port === '3000') {
    return '/api';
  }
  
  if (isStandalone) {
    return 'https://lambarki-boutique1.vercel.app/api';
  }
  
  return '/api';
};

const BASE = getApiBase();

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const isGet = !options || !options.method || options.method === 'GET';
  const cacheBuster = isGet ? `${path.includes('?') ? '&' : '?'}cb=${Date.now()}` : '';
  
  const res = await fetch(`${BASE}${path}${cacheBuster}`, {
    headers: { 
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    },
    cache: 'no-store',
    ...options
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// ── Products ────────────────────────────────────────────────────
export const api = {
  products: {
    getAll: () => request<any[]>('/products'),
    create: (data: any) => request('/products', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => request(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    adjustStock: (id: string, data: { diff: number }) => request(`/products/${id}/adjust_stock`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request(`/products/${id}`, { method: 'DELETE' }),
  },

  clients: {
    getAll: () => request<any[]>('/clients'),
    create: (data: any) => request('/clients', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => request(`/clients/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request(`/clients/${id}`, { method: 'DELETE' }),
  },

  invoices: {
    getAll: () => request<any[]>('/invoices'),
    create: (data: any) => request('/invoices', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => request(`/invoices/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request(`/invoices/${id}`, { method: 'DELETE' }),
  },

  users: {
    getAll: () => request<any[]>('/users'),
    create: (data: any) => request('/users', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => request(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request(`/users/${id}`, { method: 'DELETE' }),
  },

  movements: {
    getAll: () => request<any[]>('/movements'),
    create: (data: any) => request('/movements', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => request(`/movements/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request(`/movements/${id}`, { method: 'DELETE' }),
  },

  activities: {
    getAll: () => request<any[]>('/activities'),
    create: (data: any) => request('/activities', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => request(`/activities/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request(`/activities/${id}`, { method: 'DELETE' }),
  },

  system: {
    clearAll: () => request<{ status: string; message: string }>('/system/clear', { method: 'POST' }),
  },
};
