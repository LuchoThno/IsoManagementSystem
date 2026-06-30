import { Prop, Schema, SchemaFactory, raw } from '@nestjs/mongoose';

@Schema({ collection: 'settings' })
export class SettingsEntity {
  @Prop({ required: true, default: 'ISO Manager' })
  companyName!: string;

  @Prop({ type: Object, default: { ISO9001: true, ISO14001: true, ISO45001: true } })
  standards!: Record<string, boolean>;

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
      desktop: raw({
        enabled: { type: Boolean, default: true },
        chatMessages: { type: Boolean, default: true },
        connectionAlerts: { type: Boolean, default: true },
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
    desktop: {
      enabled: boolean;
      chatMessages: boolean;
      connectionAlerts: boolean;
    };
  };

  @Prop(
    raw({
      enabled: { type: Boolean, default: true },
      providerType: { type: String, default: 'custom' },
      providerName: { type: String, default: 'Proveedor SMTP' },
      senderName: { type: String, default: 'Sistema ISO' },
      senderEmail: { type: String, default: 'notificaciones@servasmar.cl' },
      replyTo: { type: String, default: 'calidad@servasmar.cl' },
      apiBaseUrl: {
        type: String,
        default: 'https://api.servasmar.cl/communications/send',
      },
      apiKeyHint: { type: String, default: 'configurado-en-servidor' },
    })
  )
  communicationSettings!: {
    enabled: boolean;
    providerType: 'resend' | 'gmail' | 'custom';
    providerName: string;
    senderName: string;
    senderEmail: string;
    replyTo: string;
    apiBaseUrl: string;
    apiKeyHint: string;
  };
}

export const SettingsSchema = SchemaFactory.createForClass(SettingsEntity);
