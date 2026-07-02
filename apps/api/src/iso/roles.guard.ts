import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthModeService } from './auth-mode.service';
import { ClerkDirectoryService } from './clerk-directory.service';
import type { ClerkSessionIdentity } from './clerk.types';
import { PlatformAuditService } from './platform-audit.service';
import { IS_PUBLIC_KEY } from './public.decorator';
import { ROLES_KEY, type AppUserRole } from './roles.decorator';

type AuthorizedRequest = {
  clerkAuth?: ClerkSessionIdentity;
  clerkRole?: AppUserRole;
  method?: string;
  url?: string;
  route?: {
    path?: string;
  };
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authModeService: AuthModeService,
    private readonly clerkDirectoryService: ClerkDirectoryService,
    private readonly platformAuditService: PlatformAuditService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const requiredRoles = this.reflector.getAllAndOverride<AppUserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    if (!this.authModeService.isClerkMode()) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthorizedRequest>();
    const clerkAuth = request.clerkAuth;

    if (!clerkAuth?.userId) {
      await this.captureAuthorizationFailure(request, clerkAuth, requiredRoles, {
        reason: 'missing_authenticated_user',
      });
      throw new ForbiddenException('No fue posible resolver el usuario autenticado.');
    }

    const currentUser = await this.clerkDirectoryService.getCurrentUser(clerkAuth.userId);
    request.clerkRole = currentUser.role;

    if (!requiredRoles.includes(currentUser.role)) {
      await this.captureAuthorizationFailure(request, clerkAuth, requiredRoles, {
        reason: 'insufficient_role',
        resolvedRole: currentUser.role,
      });
      throw new ForbiddenException('Tu rol no tiene permisos para realizar esta acción.');
    }

    return true;
  }

  private async captureAuthorizationFailure(
    request: AuthorizedRequest,
    clerkAuth: ClerkSessionIdentity | undefined,
    requiredRoles: AppUserRole[],
    metadata: Record<string, unknown>
  ) {
    try {
      await this.platformAuditService.captureFromSession(clerkAuth ?? null, {
        action: 'authorization.denied',
        resourceType: 'http-endpoint',
        resourceId: request.route?.path ?? request.url ?? null,
        status: 'failure',
        errorMessage: 'Acceso denegado por política de roles.',
        metadata: {
          method: request.method ?? null,
          path: request.route?.path ?? request.url ?? null,
          requiredRoles,
          ...metadata,
        },
      });
    } catch {
      // El rechazo de autorización no debe depender de la persistencia del audit log.
    }
  }
}
