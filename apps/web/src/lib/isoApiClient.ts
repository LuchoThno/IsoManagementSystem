import { getClerkSessionToken } from './clerkSession';

const API_FALLBACK_BASE = '/api';
const PRODUCTION_FRONTEND_HOSTS = new Set(['iso.servasmar.cl', 'www.iso.servasmar.cl']);

const getApiBase = () => {
  const configured = import.meta.env.VITE_API_URL?.trim();

  if (
    typeof window !== 'undefined' &&
    PRODUCTION_FRONTEND_HOSTS.has(window.location.hostname)
  ) {
    return API_FALLBACK_BASE;
  }

  return configured || API_FALLBACK_BASE;
};

const readErrorMessage = async (response: Response) => {
  const rawBody = await response.text();

  if (!rawBody) {
    return `Request failed with status ${response.status}`;
  }

  try {
    const parsed = JSON.parse(rawBody) as {
      message?: string | string[];
      error?: string;
    };

    if (Array.isArray(parsed.message) && parsed.message.length > 0) {
      return parsed.message.join(', ');
    }

    if (typeof parsed.message === 'string' && parsed.message.trim()) {
      return parsed.message;
    }

    if (typeof parsed.error === 'string' && parsed.error.trim()) {
      return parsed.error;
    }
  } catch {
    return rawBody;
  }

  return rawBody;
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
    throw new Error(await readErrorMessage(response));
  }

  return response.json() as Promise<T>;
}
