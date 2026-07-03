import { Injectable } from '@nestjs/common';
import { AuthModeService } from './auth-mode.service';
import type { ClerkSessionIdentity } from './clerk.types';
import type { SecurityPostureDto, UpdateSettingsDto } from './dto/settings.dto';
import { IsoService } from './iso.service';
import { PlatformAuditService } from './platform-audit.service';
import { ensureNonEmptyString } from './request-validation';

@Injectable()
export class SettingsOperationsService {
  constructor(
    private readonly isoService: IsoService,
    private readonly platformAuditService: PlatformAuditService,
    private readonly authModeService: AuthModeService
  ) {}

  async getSecurityPosture(
    clerkAuth: ClerkSessionIdentity | null
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

  async updateSettings(
    clerkAuth: ClerkSessionIdentity | null,
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
