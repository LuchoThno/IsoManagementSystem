import type { AppUserRole } from '../roles.decorator';
import type { TenantSummaryDto } from './tenants.dto';

export type AccessContextDto = {
  mode: 'clerk' | 'demo' | 'disabled';
  provider: 'clerk' | 'demo' | 'disabled';
  authenticated: boolean;
  capabilities: {
    directoryProvider: 'clerk' | 'local' | 'none';
    manualUserManagement: boolean;
    authenticatedRoutesAvailable: boolean;
  };
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
    role: AppUserRole;
    active: boolean;
    createdAt: string;
  } | null;
  tenant: TenantSummaryDto | null;
  permissions: {
    canViewUserDirectory: boolean;
    canManageUsers: boolean;
    canViewPlatformAudit: boolean;
    canViewSecurityPosture: boolean;
  };
};
