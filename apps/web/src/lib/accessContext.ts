import { isClerkEnabled } from './clerk';
import { fetchAuthConfig, type AuthConfig } from './authConfig';
import { requestIsoApi } from './isoApiClient';

export type AccessContext = {
  mode: 'clerk' | 'demo' | 'disabled';
  provider: 'clerk' | 'demo' | 'disabled';
  authenticated: boolean;
  capabilities: AuthConfig['capabilities'];
  session: {
    userId: string;
    appUserId: string;
    sessionId: string | null;
  } | null;
  user: {
    id: string;
    externalId: string;
    name: string;
    email: string;
    role: 'admin' | 'manager' | 'auditor' | 'viewer';
    active: boolean;
    createdAt: string;
  } | null;
  tenant: {
    id: string;
    name: string;
    slug: string;
    status: 'active' | 'inactive';
    timezone: string;
    defaultLanguage: string;
    isDefault: boolean;
    organizationId: string | null;
    createdAt: string | null;
    updatedAt: string | null;
  } | null;
  permissions: {
    canViewUserDirectory: boolean;
    canManageUsers: boolean;
    canViewPlatformAudit: boolean;
    canViewSecurityPosture: boolean;
  };
};

type AccessContextUserRole = NonNullable<AccessContext['user']>['role'];

let accessContextPromise: Promise<AccessContext> | null = null;

const hasAnyRole = (
  accessContext: AccessContext | null,
  expectedRoles: AccessContextUserRole[]
) => {
  const role = accessContext?.user?.role;
  return Boolean(role && expectedRoles.includes(role));
};

const buildFallbackAccessContext = (authConfig: AuthConfig): AccessContext => {
  const isDemo = authConfig.mode === 'demo';

  return {
    mode: authConfig.mode,
    provider: authConfig.provider,
    authenticated: authConfig.mode !== 'disabled',
    capabilities: authConfig.capabilities,
    session: null,
    user: null,
    tenant: null,
    permissions: {
      canViewUserDirectory: isDemo,
      canManageUsers: authConfig.capabilities.manualUserManagement,
      canViewPlatformAudit: false,
      canViewSecurityPosture: false,
    },
  };
};

export const canAccessUsersPanel = (accessContext: AccessContext | null) =>
  Boolean(
    accessContext &&
      (accessContext.permissions.canViewUserDirectory || accessContext.permissions.canManageUsers)
  );

export const canManageCommunicationSettings = (
  accessContext: AccessContext | null,
  authConfig?: AuthConfig | null
) =>
  Boolean(
    authConfig?.capabilities.manualUserManagement ||
      hasAnyRole(accessContext, ['admin'])
  );

export const canManageCommunicationTemplates = (
  accessContext: AccessContext | null,
  authConfig?: AuthConfig | null
) =>
  Boolean(
    authConfig?.capabilities.manualUserManagement ||
      hasAnyRole(accessContext, ['admin', 'manager'])
  );

export const canSendCommunicationCampaigns = (
  accessContext: AccessContext | null,
  authConfig?: AuthConfig | null
) =>
  Boolean(
    authConfig?.capabilities.manualUserManagement ||
      hasAnyRole(accessContext, ['admin', 'manager'])
  );

export const canViewCommunicationContent = (
  accessContext: AccessContext | null,
  authConfig?: AuthConfig | null
) =>
  Boolean(
    authConfig?.capabilities.authenticatedRoutesAvailable ||
      accessContext?.authenticated
  );

export const canManageDocuments = (
  accessContext: AccessContext | null,
  authConfig?: AuthConfig | null
) =>
  Boolean(
    authConfig?.capabilities.manualUserManagement ||
      hasAnyRole(accessContext, ['admin', 'manager'])
  );

export const canManageTasks = (
  accessContext: AccessContext | null,
  authConfig?: AuthConfig | null
) =>
  Boolean(
    authConfig?.capabilities.manualUserManagement ||
      hasAnyRole(accessContext, ['admin', 'manager'])
  );

export const canManageAudits = (
  accessContext: AccessContext | null,
  authConfig?: AuthConfig | null
) =>
  Boolean(
    authConfig?.capabilities.manualUserManagement ||
      hasAnyRole(accessContext, ['admin', 'manager', 'auditor'])
  );

export const canManageWorkflows = (
  accessContext: AccessContext | null,
  authConfig?: AuthConfig | null
) =>
  Boolean(
    authConfig?.capabilities.manualUserManagement || hasAnyRole(accessContext, ['admin', 'manager'])
  );

export const fetchAccessContext = async () => {
  const authConfig = await fetchAuthConfig();

  if (!isClerkEnabled || authConfig.mode === 'disabled') {
    return buildFallbackAccessContext(authConfig);
  }

  if (accessContextPromise) {
    return accessContextPromise;
  }

  const request = requestIsoApi<AccessContext>('/auth/access-context').catch(() =>
    buildFallbackAccessContext(authConfig)
  );
  accessContextPromise = request;

  try {
    return await request;
  } finally {
    if (accessContextPromise === request) {
      accessContextPromise = null;
    }
  }
};
