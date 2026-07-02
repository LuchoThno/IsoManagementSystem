import { isClerkEnabled } from './clerk';
import { requestIsoApi } from './isoApiClient';

export type AuthConfig = {
  mode: 'clerk' | 'demo' | 'disabled';
  source: 'env' | 'legacy-default';
  clerkConfigured: boolean;
  provider: 'clerk' | 'demo' | 'disabled';
  capabilities: {
    directoryProvider: 'clerk' | 'local' | 'none';
    manualUserManagement: boolean;
    authenticatedRoutesAvailable: boolean;
  };
};

let authConfigPromise: Promise<AuthConfig> | null = null;

const getFallbackAuthConfig = (): AuthConfig => ({
  mode: 'demo',
  source: 'legacy-default',
  clerkConfigured: false,
  provider: 'demo',
  capabilities: {
    directoryProvider: 'local',
    manualUserManagement: true,
    authenticatedRoutesAvailable: true,
  },
});

export const fetchAuthConfig = async () => {
  if (!isClerkEnabled) {
    return getFallbackAuthConfig();
  }

  if (authConfigPromise) {
    return authConfigPromise;
  }

  const request = requestIsoApi<AuthConfig>('/auth/config');
  authConfigPromise = request;

  try {
    return await request;
  } finally {
    if (authConfigPromise === request) {
      authConfigPromise = null;
    }
  }
};

export const shouldUseClerkDirectory = async () => {
  const authConfig = await fetchAuthConfig();
  return authConfig.capabilities.directoryProvider === 'clerk';
};

export const canManageUsersManually = async () => {
  const authConfig = await fetchAuthConfig();
  return authConfig.capabilities.manualUserManagement;
};

export const usesClerkAuthentication = async () => {
  const authConfig = await fetchAuthConfig();
  return authConfig.mode === 'clerk';
};
