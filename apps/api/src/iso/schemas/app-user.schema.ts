import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { AppUserRole } from '../roles.decorator';

@Schema({ collection: 'app_users', timestamps: true })
export class AppUserEntity {
  @Prop({ required: true, index: true })
  tenantId!: string;

  @Prop({ required: true, trim: true, lowercase: true, index: true })
  email!: string;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true, enum: ['admin', 'manager', 'auditor', 'viewer'], default: 'viewer' })
  role!: AppUserRole;

  @Prop({ required: true, default: true, index: true })
  active!: boolean;

  @Prop({ required: true, enum: ['clerk', 'local'], default: 'clerk', index: true })
  identityProvider!: 'clerk' | 'local';

  @Prop({ required: false, default: null, trim: true, index: true })
  externalId!: string | null;
}

export const AppUserSchema = SchemaFactory.createForClass(AppUserEntity);
AppUserSchema.index({ tenantId: 1, email: 1 }, { unique: true });
AppUserSchema.index(
  { tenantId: 1, externalId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      externalId: { $type: 'string' },
    },
  }
);
