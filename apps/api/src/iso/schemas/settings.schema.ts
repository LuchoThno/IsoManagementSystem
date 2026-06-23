import { Prop, Schema, SchemaFactory, raw } from '@nestjs/mongoose';

@Schema({ collection: 'settings' })
export class SettingsEntity {
  @Prop({ required: true, default: 'ISO Manager' })
  companyName!: string;

  @Prop(
    raw({
      ISO9001: { type: Boolean, default: true },
      ISO14001: { type: Boolean, default: true },
      ISO45001: { type: Boolean, default: true },
    })
  )
  standards!: {
    ISO9001: boolean;
    ISO14001: boolean;
    ISO45001: boolean;
  };

  @Prop({ required: true, default: 'es' })
  defaultLanguage!: string;

  @Prop({ required: true, default: 'America/Santiago' })
  timezone!: string;

  @Prop(
    raw({
      email: raw({
        enabled: { type: Boolean, default: true },
        taskReminders: { type: Boolean, default: true },
        auditReminders: { type: Boolean, default: true },
        documentUpdates: { type: Boolean, default: true },
      }),
      inApp: raw({
        enabled: { type: Boolean, default: true },
        taskReminders: { type: Boolean, default: true },
        auditReminders: { type: Boolean, default: true },
        documentUpdates: { type: Boolean, default: true },
      }),
    })
  )
  notifications!: {
    email: {
      enabled: boolean;
      taskReminders: boolean;
      auditReminders: boolean;
      documentUpdates: boolean;
    };
    inApp: {
      enabled: boolean;
      taskReminders: boolean;
      auditReminders: boolean;
      documentUpdates: boolean;
    };
  };
}

export const SettingsSchema = SchemaFactory.createForClass(SettingsEntity);
