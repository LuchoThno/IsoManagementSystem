import { Injectable } from '@nestjs/common';
import type { Model } from 'mongoose';

@Injectable()
export class TenantBackfillService {
  async ensureTenantId(model: Model<any>, tenantId: string) {
    await model.updateMany(
      {
        $or: [{ tenantId: { $exists: false } }, { tenantId: null }, { tenantId: '' }],
      },
      { $set: { tenantId } }
    );
  }

  async ensureTenantIdForMany(models: Array<Model<any>>, tenantId: string) {
    await Promise.all(models.map((model) => this.ensureTenantId(model, tenantId)));
  }
}
