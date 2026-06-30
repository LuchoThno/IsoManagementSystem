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

const getCurrentOrigin = () =>
  typeof window === 'undefined' ? '' : window.location.origin;

const rawClerkPrimaryOrigin = import.meta.env.VITE_CLERK_PRIMARY_ORIGIN?.trim() || '';
const rawClerkDomain = import.meta.env.VITE_CLERK_DOMAIN?.trim() || '';
const rawClerkIsSatellite = import.meta.env.VITE_CLERK_IS_SATELLITE?.trim() || '';

const toAbsoluteUrl = (path: string, originOverride?: string) => {
  const origin = originOverride || getCurrentOrigin();
  return origin ? `${origin}${path}` : path;
};

export const isClerkEnabled = rawPublishableKey.trim().length > 0;
export const clerkPublishableKey = rawPublishableKey.trim();
export const clerkDomain = rawClerkDomain || undefined;
export const clerkIsSatellite = rawClerkIsSatellite === 'true';
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
  ? toAbsoluteUrl(normalizedSignInPath, rawClerkPrimaryOrigin || undefined)
  : normalizedSignInPath;
export const clerkSignUpUrl = clerkIsSatellite
  ? toAbsoluteUrl(normalizedSignUpPath, rawClerkPrimaryOrigin || undefined)
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
export const clerkJwtTemplate = import.meta.env.VITE_CLERK_JWT_TEMPLATE?.trim() || '';

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
