import { Injectable } from '@nestjs/common';
import { AuthModeService } from './auth-mode.service';
import type { ClerkSessionIdentity } from './clerk.types';
import type { SecurityPostureDto, UpdateSettingsDto } from './dto/settings.dto';
import { IsoService } from './iso.service';
import { PlatformAuditService } from './platform-audit.service';
import {
  ensureBoolean,
  ensureNonEmptyString,
  ensureObject,
  ensureRecordOfBooleans,
} from './request-validation';

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
    ensureObject(body, 'body');
    ensureObject(body?.settings, 'settings');
    ensureObject(body?.notifications, 'notifications');
    ensureNonEmptyString(body?.settings?.companyName, 'settings.companyName');
    ensureNonEmptyString(body?.settings?.defaultLanguage, 'settings.defaultLanguage');
    ensureNonEmptyString(body?.settings?.timezone, 'settings.timezone');
    ensureRecordOfBooleans(body?.settings?.standards, 'settings.standards');
    ensureObject(body?.notifications?.email, 'notifications.email');
    ensureObject(body?.notifications?.inApp, 'notifications.inApp');
    ensureObject(body?.notifications?.desktop, 'notifications.desktop');
    ensureBoolean(body?.notifications?.email?.enabled, 'notifications.email.enabled');
    ensureBoolean(
      body?.notifications?.email?.taskReminders,
      'notifications.email.taskReminders'
    );
    ensureBoolean(
      body?.notifications?.email?.auditReminders,
      'notifications.email.auditReminders'
    );
    ensureBoolean(
      body?.notifications?.email?.documentUpdates,
      'notifications.email.documentUpdates'
    );
    ensureBoolean(body?.notifications?.inApp?.enabled, 'notifications.inApp.enabled');
    ensureBoolean(
      body?.notifications?.inApp?.taskReminders,
      'notifications.inApp.taskReminders'
    );
    ensureBoolean(
      body?.notifications?.inApp?.auditReminders,
      'notifications.inApp.auditReminders'
    );
    ensureBoolean(
      body?.notifications?.inApp?.documentUpdates,
      'notifications.inApp.documentUpdates'
    );
    ensureBoolean(body?.notifications?.desktop?.enabled, 'notifications.desktop.enabled');
    ensureBoolean(
      body?.notifications?.desktop?.chatMessages,
      'notifications.desktop.chatMessages'
    );
    ensureBoolean(
      body?.notifications?.desktop?.connectionAlerts,
      'notifications.desktop.connectionAlerts'
    );

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
