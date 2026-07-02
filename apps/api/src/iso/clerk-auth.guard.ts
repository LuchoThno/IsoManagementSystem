import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthModeService } from './auth-mode.service';
import { ClerkAuthService } from './clerk-auth.service';
import type { ClerkSessionIdentity } from './clerk.types';
import { PlatformAuditService } from './platform-audit.service';
import { IS_PUBLIC_KEY } from './public.decorator';

type AuthenticatedRequest = {
  headers: {
    authorization?: string;
  };
  method?: string;
  url?: string;
  route?: {
    path?: string;
  };
  clerkAuth?: ClerkSessionIdentity;
};

@Injectable()
export class ClerkAuthGuard implements CanActivate {
  constructor(
    private readonly authModeService: AuthModeService,
    private readonly clerkAuthService: ClerkAuthService,
    private readonly platformAuditService: PlatformAuditService,
    private readonly reflector: Reflector
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    try {
      this.authModeService.assertAuthenticationAvailable();

      if (!this.authModeService.isClerkMode()) {
        return true;
      }

      request.clerkAuth = await this.clerkAuthService.authenticateRequest(request);
      return true;
    } catch (error) {
      await this.captureAuthenticationFailure(request, error);
      throw error;
    }
  }

  private async captureAuthenticationFailure(
    request: AuthenticatedRequest,
    error: unknown
  ) {
    try {
      const message = error instanceof Error ? error.message : 'Authentication error';
      await this.platformAuditService.capture({
        action: 'authentication.failed',
        resourceType: 'http-endpoint',
        resourceId: request.route?.path ?? request.url ?? null,
        actorId: null,
        actorEmail: null,
        actorRole: null,
        status: 'failure',
        errorMessage: message,
        metadata: {
          method: request.method ?? null,
          path: request.route?.path ?? request.url ?? null,
          authMode: this.authModeService.getMode(),
          hasAuthorizationHeader: Boolean(request.headers.authorization),
        },
      });
    } catch {
      // La autenticación no debe depender de la persistencia del audit log.
    }
  }
}
