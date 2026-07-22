const rawApiBase = import.meta.env.VITE_API_URL?.trim();

export const API_BASE = rawApiBase ? rawApiBase.replace(/\/+$/, '') : '';
export const AUTH_INVALID_EVENT = 'auth:invalid';

export function buildApiUrl(path: string) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE}${normalizedPath}`;
}

export function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

class ApiService {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
    if (token) localStorage.setItem('token', token);
    else localStorage.removeItem('token');
  }

  getToken(): string | null {
    if (!this.token) this.token = localStorage.getItem('token');
    return this.token;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };
    const token = this.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(buildApiUrl(path), { ...options, headers });
    if (!res.ok) {
      const message = await res.text();
      if (
        res.status === 401 ||
        (res.status === 403 && message.includes('User not found'))
      ) {
        this.setToken(null);
        localStorage.removeItem('currentProject');
        window.dispatchEvent(new CustomEvent(AUTH_INVALID_EVENT, { detail: { path, status: res.status, message } }));
      }
      throw new Error(message);
    }
    return res.json() as Promise<T>;
  }

  get<T>(path: string) { return this.request<T>(path); }
  post<T>(path: string, body: unknown) { return this.request<T>(path, { method: 'POST', body: JSON.stringify(body) }); }
  put<T>(path: string, body: unknown) { return this.request<T>(path, { method: 'PUT', body: JSON.stringify(body) }); }
  patch<T>(path: string, body: unknown) { return this.request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }); }
  delete<T>(path: string) { return this.request<T>(path, { method: 'DELETE' }); }
}

export const api = new ApiService();
