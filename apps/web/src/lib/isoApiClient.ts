import { getClerkSessionToken } from './clerkSession';

const API_FALLBACK_BASE = '/api';

const getApiBase = () => {
  const configured = import.meta.env.VITE_API_URL?.trim();

  if (typeof window !== 'undefined' && window.location.hostname === 'iso.servasmar.cl') {
    return API_FALLBACK_BASE;
  }

  return configured || API_FALLBACK_BASE;
};

export async function requestIsoApi<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getClerkSessionToken();
  const response = await fetch(`${getApiBase()}/iso${path}`, {
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
