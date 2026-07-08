import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthController } from './auth.controller';
import { AuthModeService } from './auth-mode.service';
import { ClerkAuthGuard } from './clerk-auth.guard';
import { ClerkAuthService } from './clerk-auth.service';
import { ClerkDirectoryService } from './clerk-directory.service';
import { PlatformAuditService } from './platform-audit.service';
import { RolesGuard } from './roles.guard';
import {
  PlatformAuditLogEntity,
  PlatformAuditLogSchema,
} from './schemas/platform-audit-log.schema';
import { AppUserEntity, AppUserSchema } from './schemas/app-user.schema';
import { SettingsEntity, SettingsSchema } from './schemas/settings.schema';
import { TenantEntity, TenantSchema } from './schemas/tenant.schema';
import { TenantContextService } from './tenant-context.service';
import { TenantsController } from './tenants.controller';
import { TenantsOperationsService } from './tenants-operations.service';
import { UsersController } from './users.controller';
import { UsersOperationsService } from './users-operations.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PlatformAuditLogEntity.name, schema: PlatformAuditLogSchema },
      { name: AppUserEntity.name, schema: AppUserSchema },
      { name: SettingsEntity.name, schema: SettingsSchema },
      { name: TenantEntity.name, schema: TenantSchema },
    ]),
  ],
  controllers: [AuthController, UsersController, TenantsController],
  providers: [
    AuthModeService,
    ClerkAuthService,
    ClerkAuthGuard,
    ClerkDirectoryService,
    PlatformAuditService,
    RolesGuard,
    TenantContextService,
    TenantsOperationsService,
    UsersOperationsService,
  ],
  exports: [
    AuthModeService,
    ClerkAuthService,
    ClerkAuthGuard,
    ClerkDirectoryService,
    PlatformAuditService,
    RolesGuard,
    TenantContextService,
  ],
})
export class AuthUsersTenantsModule {}
