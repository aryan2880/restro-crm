const API_HOST = import.meta.env.VITE_API_URL || '';
const BASE_URL = `${API_HOST}/api`;

export const getAuthToken = (): string | null => {
  return localStorage.getItem('platepulse_token');
};

export const setAuthToken = (token: string): void => {
  localStorage.setItem('platepulse_token', token);
};

export const removeAuthToken = (): void => {
  localStorage.removeItem('platepulse_token');
};

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/public/')) {
    // Token expired or invalid
    removeAuthToken();
    window.location.href = '/login';
    throw new Error('Session expired. Please log in again.');
  }

  const contentType = response.headers.get('content-type');
  let data: any = null;
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const errorMsg = data?.error || (typeof data === 'string' ? data : 'An unexpected request error occurred.');
    throw new Error(errorMsg);
  }

  return data as T;
}

export const api = {
  get: <T>(url: string) => request<T>(url, { method: 'GET' }),
  post: <T>(url: string, body?: any) => request<T>(url, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: <T>(url: string, body?: any) => request<T>(url, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(url: string, body?: any) => request<T>(url, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(url: string) => request<T>(url, { method: 'DELETE' }),
};
