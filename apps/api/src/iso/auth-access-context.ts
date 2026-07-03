import type { DirectoryUser, ClerkSessionIdentity } from './clerk.types';
import type { AccessContextDto } from './dto/auth.dto';
import type { AppAuthMode } from './auth-mode.service';
import type { AppUserRole } from './roles.decorator';

type PublicCapabilities = AccessContextDto['capabilities'];

const hasAnyRole = (role: AppUserRole | null, expectedRoles: AppUserRole[]) => {
  if (!role) {
    return false;
  }

  return expectedRoles.includes(role);
};

export const resolveAuthProvider = (mode: AppAuthMode): AccessContextDto['provider'] => {
  switch (mode) {
    case 'clerk':
      return 'clerk';
    case 'demo':
      return 'demo';
    default:
      return 'disabled';
  }
};

export const buildAccessContext = ({
  mode,
  capabilities,
  session,
  user,
}: {
  mode: AppAuthMode;
  capabilities: PublicCapabilities;
  session: ClerkSessionIdentity | null;
  user: DirectoryUser | null;
}): AccessContextDto => {
  const role = user?.role ?? null;

  return {
    mode,
    provider: resolveAuthProvider(mode),
    authenticated: mode !== 'disabled',
    capabilities,
    session: session
      ? {
          userId: session.userId,
          appUserId: session.appUserId,
          sessionId: session.sessionId,
        }
      : null,
    user,
    permissions: {
      canViewUserDirectory: hasAnyRole(role, ['admin', 'manager']),
      canManageUsers: capabilities.manualUserManagement || hasAnyRole(role, ['admin']),
      canViewPlatformAudit: hasAnyRole(role, ['admin']),
      canViewSecurityPosture: hasAnyRole(role, ['admin']),
    },
  };
};
