import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { ClerkAuth } from './clerk-auth.decorator';
import { ClerkAuthGuard } from './clerk-auth.guard';
import type { SecurityPostureDto, UpdateSettingsDto } from './dto/settings.dto';
import { Roles } from './roles.decorator';
import { RolesGuard } from './roles.guard';
import type { ClerkSessionIdentity } from './clerk.types';
import { SettingsOperationsService } from './settings-operations.service';

@Controller('iso')
@UseGuards(ClerkAuthGuard, RolesGuard)
export class SettingsController {
  constructor(private readonly settingsOperationsService: SettingsOperationsService) {}

  @Get('security/posture')
  @Roles('admin')
  async getSecurityPosture(
    @ClerkAuth() clerkAuth: ClerkSessionIdentity | null
  ): Promise<SecurityPostureDto> {
    return this.settingsOperationsService.getSecurityPosture(clerkAuth);
  }

  @Put('settings')
  @Roles('admin')
  async updateSettings(
    @ClerkAuth() clerkAuth: ClerkSessionIdentity | null,
    @Body()
    body: UpdateSettingsDto
  ) {
    return this.settingsOperationsService.updateSettings(clerkAuth, body);
  }
}
