import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { TenantSummaryDto } from './dto/tenants.dto';
import { SettingsEntity } from './schemas/settings.schema';
import { TenantEntity } from './schemas/tenant.schema';

@Injectable()
export class TenantContextService {
  constructor(
    @InjectModel(TenantEntity.name)
    private readonly tenantModel: Model<TenantEntity>,
    @InjectModel(SettingsEntity.name)
    private readonly settingsModel: Model<SettingsEntity>
  ) {}

  async resolveEffectiveTenant(): Promise<TenantSummaryDto> {
    const existingDefault =
      (await this.tenantModel.findOne({ isDefault: true }).lean()) ??
      (await this.tenantModel.findOne().sort({ createdAt: 1 }).lean());

    if (existingDefault) {
      if (!existingDefault.isDefault) {
        await this.tenantModel.updateOne({ _id: existingDefault._id }, { isDefault: true });
        return this.serialize({
          ...existingDefault,
          isDefault: true,
        });
      }

      return this.serialize(existingDefault);
    }

    const settings = await this.settingsModel.findOne().lean();
    const companyName = settings?.companyName?.trim() || 'ISO Manager';
    const created = await this.tenantModel.create({
      name: companyName,
      slug: this.buildSlug(companyName),
      status: 'active',
      timezone: settings?.timezone || 'America/Santiago',
      defaultLanguage: settings?.defaultLanguage || 'es',
      isDefault: true,
      organizationId: process.env.APP_DEFAULT_ORGANIZATION_ID?.trim() || null,
    });

    return this.serialize(created.toObject());
  }

  async resolveEffectiveTenantId(): Promise<string> {
    const tenant = await this.resolveEffectiveTenant();
    return tenant.id;
  }

  async listTenants(): Promise<TenantSummaryDto[]> {
    await this.resolveEffectiveTenant();
    const tenants = await this.tenantModel.find().sort({ isDefault: -1, name: 1 }).lean();
    return tenants.map((tenant) => this.serialize(tenant));
  }

  private buildSlug(value: string) {
    const normalized = value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    return normalized || 'default-tenant';
  }

  private serialize(tenant: any): TenantSummaryDto {
    return {
      id: String(tenant._id),
      name: tenant.name,
      slug: tenant.slug,
      status: tenant.status,
      timezone: tenant.timezone,
      defaultLanguage: tenant.defaultLanguage,
      isDefault: Boolean(tenant.isDefault),
      organizationId: tenant.organizationId ?? null,
      createdAt: tenant.createdAt ?? null,
      updatedAt: tenant.updatedAt ?? null,
    };
  }
}
