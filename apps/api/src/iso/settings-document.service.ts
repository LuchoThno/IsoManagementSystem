import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SettingsEntity } from './schemas/settings.schema';

@Injectable()
export class SettingsDocumentService {
  constructor(
    @InjectModel(SettingsEntity.name)
    private readonly settingsModel: Model<SettingsEntity>
  ) {}

  async getSettingsDocument() {
    let settings = await this.settingsModel.findOne();

    if (!settings) {
      settings = await this.settingsModel.create({
        companyName: 'ISO Manager',
        standards: {
          ISO9001: true,
          ISO14001: true,
          ISO45001: true,
        },
        defaultLanguage: 'es',
        timezone: 'America/Santiago',
        notifications: {
          email: {
            enabled: true,
            taskReminders: true,
            auditReminders: true,
            documentUpdates: true,
          },
          inApp: {
            enabled: true,
            taskReminders: true,
            auditReminders: true,
            documentUpdates: true,
          },
          desktop: {
            enabled: true,
            chatMessages: true,
            connectionAlerts: true,
          },
        },
        communicationSettings: {
          enabled: true,
          providerType: 'custom',
          providerName: 'Proveedor SMTP',
          senderName: 'Sistema ISO',
          senderEmail: 'notificaciones@servasmar.cl',
          replyTo: 'calidad@servasmar.cl',
          apiBaseUrl: 'https://api.servasmar.cl/communications/send',
          apiKeyHint: 'configurado-en-servidor',
        },
      });
    }

    const normalizedNotifications = this.normalizeNotifications(settings.notifications);
    const normalizedCommunicationSettings = this.normalizeCommunicationSettings(
      settings.communicationSettings
    );
    let shouldSave = false;

    if (JSON.stringify(settings.notifications) !== JSON.stringify(normalizedNotifications)) {
      settings.notifications = normalizedNotifications;
      settings.markModified('notifications');
      shouldSave = true;
    }

    if (
      JSON.stringify(settings.communicationSettings) !==
      JSON.stringify(normalizedCommunicationSettings)
    ) {
      settings.communicationSettings = normalizedCommunicationSettings;
      settings.markModified('communicationSettings');
      shouldSave = true;
    }

    if (shouldSave) {
      await settings.save();
    }

    return settings;
  }

  normalizeNotifications(
    notifications: Partial<SettingsEntity['notifications']> | undefined
  ): SettingsEntity['notifications'] {
    return {
      email: {
        enabled: notifications?.email?.enabled ?? true,
        taskReminders: notifications?.email?.taskReminders ?? true,
        auditReminders: notifications?.email?.auditReminders ?? true,
        documentUpdates: notifications?.email?.documentUpdates ?? true,
      },
      inApp: {
        enabled: notifications?.inApp?.enabled ?? true,
        taskReminders: notifications?.inApp?.taskReminders ?? true,
        auditReminders: notifications?.inApp?.auditReminders ?? true,
        documentUpdates: notifications?.inApp?.documentUpdates ?? true,
      },
      desktop: {
        enabled: notifications?.desktop?.enabled ?? true,
        chatMessages: notifications?.desktop?.chatMessages ?? true,
        connectionAlerts: notifications?.desktop?.connectionAlerts ?? true,
      },
    };
  }

  normalizeCommunicationSettings(
    communicationSettings: Partial<SettingsEntity['communicationSettings']> | undefined
  ): SettingsEntity['communicationSettings'] {
    return {
      enabled: communicationSettings?.enabled ?? true,
      providerType: communicationSettings?.providerType ?? 'custom',
      providerName: communicationSettings?.providerName ?? 'Proveedor SMTP',
      senderName: communicationSettings?.senderName ?? 'Sistema ISO',
      senderEmail: communicationSettings?.senderEmail ?? 'notificaciones@servasmar.cl',
      replyTo: communicationSettings?.replyTo ?? 'calidad@servasmar.cl',
      apiBaseUrl:
        communicationSettings?.apiBaseUrl ?? 'https://api.servasmar.cl/communications/send',
      apiKeyHint: communicationSettings?.apiKeyHint ?? 'configurado-en-servidor',
    };
  }
}
