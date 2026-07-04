import { Injectable } from '@nestjs/common';
import type { ClerkSessionIdentity } from './clerk.types';
import type { TenantSummaryDto } from './dto/tenants.dto';
import { PlatformAuditService } from './platform-audit.service';
import { TenantContextService } from './tenant-context.service';

@Injectable()
export class TenantsOperationsService {
  constructor(
    private readonly tenantContextService: TenantContextService,
    private readonly platformAuditService: PlatformAuditService
  ) {}

  async getCurrentTenant(
    clerkAuth: ClerkSessionIdentity | null
  ): Promise<TenantSummaryDto> {
    const tenant = await this.resolveEffectiveTenant();

    await this.platformAuditService.captureFromSession(clerkAuth, {
      action: 'tenant.current.read',
      resourceType: 'tenant',
      resourceId: tenant.id,
      status: 'success',
      metadata: {
        slug: tenant.slug,
        status: tenant.status,
        isDefault: tenant.isDefault,
      },
    });

    return tenant;
  }

  async listTenants(clerkAuth: ClerkSessionIdentity | null): Promise<TenantSummaryDto[]> {
    const serialized = await this.tenantContextService.listTenants();

    await this.platformAuditService.captureFromSession(clerkAuth, {
      action: 'tenant.list',
      resourceType: 'tenant',
      status: 'success',
      metadata: {
        count: serialized.length,
      },
    });

    return serialized;
  }

  async resolveEffectiveTenant(): Promise<TenantSummaryDto> {
    return this.tenantContextService.resolveEffectiveTenant();
  }
}
