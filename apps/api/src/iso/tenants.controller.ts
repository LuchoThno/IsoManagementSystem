import { Controller, Get, UseGuards } from '@nestjs/common';
import { ClerkAuth } from './clerk-auth.decorator';
import { ClerkAuthGuard } from './clerk-auth.guard';
import type { ClerkSessionIdentity } from './clerk.types';
import type { TenantSummaryDto } from './dto/tenants.dto';
import { Roles } from './roles.decorator';
import { RolesGuard } from './roles.guard';
import { TenantsOperationsService } from './tenants-operations.service';

@Controller('iso')
@UseGuards(ClerkAuthGuard, RolesGuard)
export class TenantsController {
  constructor(private readonly tenantsOperationsService: TenantsOperationsService) {}

  @Get('tenants/current')
  async getCurrentTenant(
    @ClerkAuth() clerkAuth: ClerkSessionIdentity | null
  ): Promise<TenantSummaryDto> {
    return this.tenantsOperationsService.getCurrentTenant(clerkAuth);
  }

  @Get('tenants')
  @Roles('admin', 'manager')
  async listTenants(
    @ClerkAuth() clerkAuth: ClerkSessionIdentity | null
  ): Promise<TenantSummaryDto[]> {
    return this.tenantsOperationsService.listTenants(clerkAuth);
  }
}
