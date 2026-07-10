import { BadRequestException, Injectable } from '@nestjs/common';
import { google } from 'googleapis';
import { Resend } from 'resend';
import { SettingsEntity } from './schemas/settings.schema';

type CommunicationProviderType = 'resend' | 'gmail' | 'custom';

type CommunicationProviderCompatibility = {
  type: CommunicationProviderType;
  label: string;
  transport: 'sdk' | 'api';
  configured: boolean;
  selected: boolean;
  missing: string[];
  detail: string;
};

type CommunicationCompatibility = {
  activeProvider: CommunicationProviderType;
  canSend: boolean;
  checkedAt: string;
  recommendations: string[];
  providers: CommunicationProviderCompatibility[];
};

type SendEmailPayload = {
  settings: SettingsEntity['communicationSettings'];
  recipients: string[];
  subject: string;
  html: string;
  attachments?: Array<{
    filename: string;
    contentBase64: string;
    contentType: string;
  }>;
};

type SendEmailResult = {
  provider: CommunicationProviderType;
  reference: string | null;
};

@Injectable()
export class EmailDeliveryService {
  getCompatibility(
    settings: SettingsEntity['communicationSettings']
  ): CommunicationCompatibility {
    const activeProvider = this.resolveProviderType(settings);
    const providers: CommunicationProviderCompatibility[] = [
      this.getResendCompatibility(activeProvider),
      this.getGmailCompatibility(activeProvider),
      this.getCustomCompatibility(settings, activeProvider),
    ];

    const selectedProvider = providers.find((provider) => provider.selected) ?? providers[0];
    const recommendations: string[] = [];

    if (!settings.enabled) {
      recommendations.push('Activa el canal de comunicaciones para habilitar envios reales.');
    }

    if (!selectedProvider.configured) {
      recommendations.push(
        `Completa ${selectedProvider.missing.join(', ')} para usar ${selectedProvider.label}.`
      );
    }

    if (activeProvider === 'gmail') {
      recommendations.push(
        'Gmail funciona, pero requiere OAuth. Resend es mas simple para despliegues en Vercel y VPS.'
      );
    }

    if (activeProvider === 'custom') {
      recommendations.push(
        'El proveedor personalizado depende de un webhook activo y una firma de backend estable.'
      );
    }

    return {
      activeProvider,
      canSend: settings.enabled && selectedProvider.configured,
      checkedAt: new Date().toISOString(),
      recommendations,
      providers,
    };
  }

  async sendEmail(payload: SendEmailPayload): Promise<SendEmailResult> {
    const provider = this.resolveProviderType(payload.settings);
    const recipients = Array.from(
      new Set(payload.recipients.map((recipient) => recipient.trim()).filter(Boolean))
    );

    if (!payload.settings.enabled) {
      throw new BadRequestException('El canal de comunicaciones esta deshabilitado.');
    }

    if (recipients.length === 0) {
      throw new BadRequestException('No hay destinatarios con correo valido para el envio.');
    }

    if (provider === 'resend') {
      return this.sendWithResend(
        payload.settings,
        recipients,
        payload.subject,
        payload.html,
        payload.attachments ?? []
      );
    }

    if (provider === 'gmail') {
      return this.sendWithGmail(payload.settings, recipients, payload.subject, payload.html);
    }

    return this.sendWithCustomWebhook(payload.settings, recipients, payload.subject, payload.html);
  }

  private async sendWithResend(
    settings: SettingsEntity['communicationSettings'],
    recipients: string[],
    subject: string,
    html: string,
    attachments: SendEmailPayload['attachments']
  ): Promise<SendEmailResult> {
    const apiKey = process.env.RESEND_API_KEY?.trim();

    if (!apiKey) {
      throw new BadRequestException('Falta RESEND_API_KEY para enviar con Resend.');
    }

    const resend = new Resend(apiKey);
    const response = await resend.emails.send({
      from: this.buildFromHeader(settings),
      to: settings.senderEmail,
      bcc: recipients,
      replyTo: settings.replyTo || undefined,
      subject,
      html,
      attachments: (attachments ?? []).map((attachment) => ({
        filename: attachment.filename,
        content: attachment.contentBase64,
      })),
    });

    if (response.error) {
      throw new BadRequestException(
        `Resend rechazo el envio: ${response.error.message || 'sin detalle'}`
      );
    }

    return {
      provider: 'resend',
      reference: response.data?.id ?? null,
    };
  }

  private async sendWithGmail(
    settings: SettingsEntity['communicationSettings'],
    recipients: string[],
    subject: string,
    html: string
  ): Promise<SendEmailResult> {
    const credentials = this.getGmailCredentials();
    const missing = Object.entries(credentials)
      .filter(([, value]) => !value)
      .map(([key]) => key);

    if (missing.length > 0) {
      throw new BadRequestException(
        `Faltan credenciales de Gmail: ${missing.join(', ')}`
      );
    }

    const auth = new google.auth.OAuth2(credentials.clientId, credentials.clientSecret);
    auth.setCredentials({ refresh_token: credentials.refreshToken });

    const gmail = google.gmail({ version: 'v1', auth });
    const rawMessage = this.toBase64Url(
      [
        `From: ${this.buildFromHeader(settings)}`,
        `To: ${settings.senderEmail}`,
        `Bcc: ${recipients.join(', ')}`,
        `Reply-To: ${settings.replyTo}`,
        `Subject: ${subject}`,
        'MIME-Version: 1.0',
        'Content-Type: text/html; charset=UTF-8',
        '',
        html,
      ].join('\r\n')
    );

    const response = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: rawMessage,
      },
    });

    return {
      provider: 'gmail',
      reference: response.data.id ?? null,
    };
  }

  private async sendWithCustomWebhook(
    settings: SettingsEntity['communicationSettings'],
    recipients: string[],
    subject: string,
    html: string
  ): Promise<SendEmailResult> {
    const endpoint = settings.apiBaseUrl.trim();

    if (!endpoint) {
      throw new BadRequestException(
        'El proveedor personalizado requiere un apiBaseUrl configurado.'
      );
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(process.env.COMMUNICATIONS_WEBHOOK_TOKEN
          ? {
              authorization: `Bearer ${process.env.COMMUNICATIONS_WEBHOOK_TOKEN}`,
            }
          : {}),
      },
      body: JSON.stringify({
        provider: settings.providerName,
        from: this.buildFromHeader(settings),
        senderEmail: settings.senderEmail,
        replyTo: settings.replyTo,
        recipients,
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new BadRequestException(
        `El webhook del proveedor respondio ${response.status}: ${detail || 'sin detalle'}`
      );
    }

    const body = (await response.json().catch(() => null)) as { id?: string } | null;

    return {
      provider: 'custom',
      reference: body?.id ?? null,
    };
  }

  private getResendCompatibility(
    activeProvider: CommunicationProviderType
  ): CommunicationProviderCompatibility {
    const required = {
      RESEND_API_KEY: process.env.RESEND_API_KEY?.trim(),
    };

    return {
      type: 'resend',
      label: 'Resend',
      transport: 'sdk',
      configured: this.getMissing(required).length === 0,
      selected: activeProvider === 'resend',
      missing: this.getMissing(required),
      detail: 'SDK oficial para Node, simple de operar en Vercel y VPS.',
    };
  }

  private getGmailCompatibility(
    activeProvider: CommunicationProviderType
  ): CommunicationProviderCompatibility {
    const credentials = this.getGmailCredentials();
    const required = {
      GMAIL_CLIENT_ID: credentials.clientId,
      GMAIL_CLIENT_SECRET: credentials.clientSecret,
      GMAIL_REFRESH_TOKEN: credentials.refreshToken,
    };

    return {
      type: 'gmail',
      label: 'Gmail API',
      transport: 'sdk',
      configured: this.getMissing(required).length === 0,
      selected: activeProvider === 'gmail',
      missing: this.getMissing(required),
      detail: 'Usa OAuth con googleapis; sirve, pero es mas sensible a configuracion.',
    };
  }

  private getCustomCompatibility(
    settings: SettingsEntity['communicationSettings'],
    activeProvider: CommunicationProviderType
  ): CommunicationProviderCompatibility {
    const required = {
      COMMUNICATIONS_WEBHOOK_URL: settings.apiBaseUrl?.trim(),
    };

    return {
      type: 'custom',
      label: 'Webhook personalizado',
      transport: 'api',
      configured: this.getMissing(required).length === 0,
      selected: activeProvider === 'custom',
      missing: this.getMissing(required),
      detail: 'Compatibilidad con backends propios o pasarelas internas de correo.',
    };
  }

  private resolveProviderType(
    settings: SettingsEntity['communicationSettings']
  ): CommunicationProviderType {
    if (settings.providerType) {
      return settings.providerType;
    }

    const providerName = settings.providerName.trim().toLowerCase();
    if (providerName.includes('resend')) return 'resend';
    if (providerName.includes('gmail')) return 'gmail';
    return 'custom';
  }

  private buildFromHeader(settings: SettingsEntity['communicationSettings']) {
    return `${settings.senderName} <${settings.senderEmail}>`;
  }

  private getGmailCredentials() {
    return {
      clientId:
        process.env.GMAIL_CLIENT_ID?.trim() ||
        process.env.GOOGLE_CALENDAR_CLIENT_ID?.trim() ||
        '',
      clientSecret:
        process.env.GMAIL_CLIENT_SECRET?.trim() ||
        process.env.GOOGLE_CALENDAR_CLIENT_SECRET?.trim() ||
        '',
      refreshToken:
        process.env.GMAIL_REFRESH_TOKEN?.trim() ||
        process.env.GOOGLE_CALENDAR_REFRESH_TOKEN?.trim() ||
        '',
    };
  }

  private getMissing(required: Record<string, string | undefined>) {
    return Object.entries(required)
      .filter(([, value]) => !value || !value.trim())
      .map(([key]) => key);
  }

  private toBase64Url(value: string) {
    return Buffer.from(value)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '');
  }
}
