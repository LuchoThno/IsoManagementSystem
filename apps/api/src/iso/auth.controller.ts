import { Controller, Get, UseGuards } from '@nestjs/common';
import { buildAccessContext, resolveAuthProvider } from './auth-access-context';
import { AuthModeService } from './auth-mode.service';
import { ClerkAuth } from './clerk-auth.decorator';
import { ClerkAuthGuard } from './clerk-auth.guard';
import { ClerkDirectoryService } from './clerk-directory.service';
import type { AccessContextDto } from './dto/auth.dto';
import { PlatformAuditService } from './platform-audit.service';
import { Public } from './public.decorator';
import { RolesGuard } from './roles.guard';
import { TenantContextService } from './tenant-context.service';
import type { ClerkSessionIdentity } from './clerk.types';

@Controller('iso/auth')
@UseGuards(ClerkAuthGuard, RolesGuard)
export class AuthController {
  constructor(
    private readonly authModeService: AuthModeService,
    private readonly clerkDirectoryService: ClerkDirectoryService,
    private readonly platformAuditService: PlatformAuditService,
    private readonly tenantContextService: TenantContextService
  ) {}

  @Public()
  @Get('config')
  getAuthConfig() {
    return this.authModeService.getPublicConfig();
  }

  @Get('clerk/me')
  getCurrentClerkUser(@ClerkAuth() clerkAuth: ClerkSessionIdentity | null) {
    if (!clerkAuth || !this.authModeService.isClerkMode()) {
      return null;
    }

    return this.clerkDirectoryService.getCurrentUser(clerkAuth.userId);
  }

  @Get('session')
  async getSession(@ClerkAuth() clerkAuth: ClerkSessionIdentity | null) {
    const response = {
      mode: this.authModeService.getMode(),
      authenticated: !this.authModeService.isDisabledMode(),
      provider: resolveAuthProvider(this.authModeService.getMode()),
      session: clerkAuth
        ? {
            userId: clerkAuth.userId,
            appUserId: clerkAuth.appUserId,
            sessionId: clerkAuth.sessionId,
          }
        : null,
    };

    await this.platformAuditService.captureFromSession(clerkAuth, {
      action: 'authentication.session.read',
      resourceType: 'session',
      resourceId: clerkAuth?.sessionId ?? null,
      status: 'success',
      metadata: {
        mode: response.mode,
        provider: response.provider,
        authenticated: response.authenticated,
      },
    });

    return response;
  }

  @Get('access-context')
  async getAccessContext(
    @ClerkAuth() clerkAuth: ClerkSessionIdentity | null
  ): Promise<AccessContextDto> {
    const mode = this.authModeService.getMode();
    const capabilities = this.authModeService.getPublicConfig().capabilities;
    const currentUser =
      clerkAuth?.userId && this.authModeService.isClerkMode()
        ? await this.clerkDirectoryService.getCurrentUser(clerkAuth.userId)
        : null;
    const tenant = await this.tenantContextService.resolveEffectiveTenant();
    const response = buildAccessContext({
      mode,
      capabilities,
      session: clerkAuth,
      user: currentUser,
      tenant,
    });

    await this.platformAuditService.captureFromSession(clerkAuth, {
      action: 'authentication.access-context.read',
      resourceType: 'access-context',
      resourceId: clerkAuth?.sessionId ?? null,
      status: 'success',
      metadata: {
        mode: response.mode,
        provider: response.provider,
        role: currentUser?.role ?? null,
        tenantId: tenant.id,
        permissions: response.permissions,
      },
    });

    return response;
  }
}
