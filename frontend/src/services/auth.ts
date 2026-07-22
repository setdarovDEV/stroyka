import { api } from './api';
import type { AuthResponse, AuthUser, Role } from '@/api/types';

export async function login(username: string, password: string) {
  const res = await api.post<AuthResponse>('/auth/login', { username, password });
  api.setToken(res.token);
  return res;
}

export async function register(data: { fullName: string; username: string; password: string; role: Role; email?: string; phone?: string }) {
  const res = await api.post<AuthResponse>('/auth/register', data);
  api.setToken(res.token);
  return res;
}

export function logout() {
  api.setToken(null);
}

export function getCurrentUser(): AuthUser | null {
  const token = api.getToken();
  if (!token) return null;
  try {
    return JSON.parse(atob(token.split('.')[1])) as AuthUser;
  } catch {
    return null;
  }
}
