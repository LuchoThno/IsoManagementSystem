import {
  Injectable,
} from '@nestjs/common';
import type { UpdateSettingsDto } from './dto/settings.dto';
import { SettingsDocumentService } from './settings-document.service';

@Injectable()
export class IsoService {
  constructor(private readonly settingsDocumentService: SettingsDocumentService) {}

  async updateSettings(
    settings: UpdateSettingsDto['settings'],
    notifications: UpdateSettingsDto['notifications']
  ) {
    const current = await this.settingsDocumentService.getSettingsDocument();
    current.companyName = settings.companyName;
    current.standards = settings.standards;
    current.defaultLanguage = settings.defaultLanguage;
    current.timezone = settings.timezone;
    current.notifications = this.settingsDocumentService.normalizeNotifications(notifications);
    current.markModified('notifications');
    await current.save();

    return {
      settings,
      notifications: this.settingsDocumentService.normalizeNotifications(current.notifications),
    };
  }
}
