import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { AuthModeService } from './auth-mode.service';
import { ClerkAuth } from './clerk-auth.decorator';
import { ClerkAuthGuard } from './clerk-auth.guard';
import type { SecurityPostureDto, UpdateSettingsDto } from './dto/settings.dto';
import { IsoService } from './iso.service';
import { PlatformAuditService } from './platform-audit.service';
import { ensureNonEmptyString } from './request-validation';
import { Roles } from './roles.decorator';
import { RolesGuard } from './roles.guard';
import type { ClerkSessionIdentity } from './clerk.types';

@Controller('iso')
@UseGuards(ClerkAuthGuard, RolesGuard)
export class SettingsController {
  constructor(
    private readonly isoService: IsoService,
    private readonly platformAuditService: PlatformAuditService,
    private readonly authModeService: AuthModeService
  ) {}

  @Get('security/posture')
  @Roles('admin')
  async getSecurityPosture(
    @ClerkAuth() clerkAuth: ClerkSessionIdentity | null
  ): Promise<SecurityPostureDto> {
    const response: SecurityPostureDto = {
      authMode: this.authModeService.getMode(),
      authenticationAvailable: !this.authModeService.isDisabledMode(),
      clerkConfigured: this.authModeService.isClerkConfigured(),
      controls: {
        rbac: true,
        platformAudit: true,
      },
      policies: this.authModeService.getSecurityPolicy(),
    };

    await this.platformAuditService.captureFromSession(clerkAuth, {
      action: 'security.posture.read',
      resourceType: 'security-posture',
      status: 'success',
      metadata: response,
    });

    return response;
  }

  @Put('settings')
  @Roles('admin')
  async updateSettings(
    @ClerkAuth() clerkAuth: ClerkSessionIdentity | null,
    @Body()
    body: UpdateSettingsDto
  ) {
    ensureNonEmptyString(body?.settings?.companyName, 'settings.companyName');
    ensureNonEmptyString(body?.settings?.defaultLanguage, 'settings.defaultLanguage');
    ensureNonEmptyString(body?.settings?.timezone, 'settings.timezone');

    const result = await this.isoService.updateSettings(body.settings, body.notifications);
    await this.platformAuditService.captureFromSession(clerkAuth, {
      action: 'settings.update',
      resourceType: 'settings',
      status: 'success',
      metadata: {
        companyName: body.settings.companyName,
        defaultLanguage: body.settings.defaultLanguage,
        timezone: body.settings.timezone,
      },
    });
    return result;
  }
}
