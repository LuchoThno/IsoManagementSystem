import type { UserRole } from '../types/iso';

const normalizePath = (value: string | undefined, fallback: string) => {
  if (!value || !value.trim()) {
    return fallback;
  }

  return value.startsWith('/') ? value : `/${value}`;
};

const rawPublishableKey =
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ||
  import.meta.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
  '';

const getCurrentHostname = () =>
  typeof window === 'undefined' ? '' : window.location.hostname;

const getCurrentOrigin = () =>
  typeof window === 'undefined' ? '' : window.location.origin;

const isIsoSatelliteHost = () => getCurrentHostname() === 'iso.servasmar.cl';
const getClerkPrimaryOrigin = () =>
  import.meta.env.VITE_CLERK_PRIMARY_ORIGIN?.trim() || 'https://servasmar.cl';

const toAbsoluteUrl = (path: string, originOverride?: string) => {
  const origin = originOverride || getCurrentOrigin();
  return origin ? `${origin}${path}` : path;
};

export const isClerkEnabled = rawPublishableKey.trim().length > 0;
export const clerkPublishableKey = rawPublishableKey.trim();
export const clerkDomain = import.meta.env.VITE_CLERK_DOMAIN?.trim() || 'servasmar.cl';
export const clerkIsSatellite = isIsoSatelliteHost();
const normalizedSignInPath = normalizePath(
  import.meta.env.VITE_CLERK_SIGN_IN_URL || import.meta.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL,
  '/sign-in'
);
const normalizedSignUpPath = normalizePath(
  import.meta.env.VITE_CLERK_SIGN_UP_URL || import.meta.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL,
  normalizedSignInPath
);
export const clerkSignInPath = normalizedSignInPath;
export const clerkSignUpPath = normalizedSignUpPath;
export const clerkSignInUrl = clerkIsSatellite
  ? toAbsoluteUrl(normalizedSignInPath, getClerkPrimaryOrigin())
  : normalizedSignInPath;
export const clerkSignUpUrl = clerkIsSatellite
  ? toAbsoluteUrl(normalizedSignUpPath, getClerkPrimaryOrigin())
  : normalizedSignUpPath;
export const clerkAfterSignInUrl = normalizePath(
  import.meta.env.VITE_CLERK_AFTER_SIGN_IN_URL ||
    import.meta.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL,
  '/'
);
export const clerkAfterSignUpUrl = normalizePath(
  import.meta.env.VITE_CLERK_AFTER_SIGN_UP_URL ||
    import.meta.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL,
  clerkAfterSignInUrl
);

const supportedRoles = new Set<UserRole>(['admin', 'manager', 'auditor', 'viewer']);

export const resolveClerkRole = (
  publicMetadata?: Record<string, unknown>,
  unsafeMetadata?: Record<string, unknown>
): UserRole | undefined => {
  const candidates = [publicMetadata?.role, unsafeMetadata?.role];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && supportedRoles.has(candidate as UserRole)) {
      return candidate as UserRole;
    }
  }

  return undefined;
};
