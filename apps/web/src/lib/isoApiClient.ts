import { getClerkSessionToken } from './clerkSession';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export async function requestIsoApi<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getClerkSessionToken();
  const response = await fetch(`${API_BASE}/iso${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}
