import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { google } from 'googleapis';

type GoogleDriveStatus = {
  enabled: boolean;
  configured: boolean;
  rootFolderId: string | null;
  missing: string[];
};

type UploadPdfInput = {
  fileName: string;
  pdfBytes: Buffer;
};

type UploadPdfResult = {
  provider: 'google-drive';
  stored: boolean;
  locationLabel: string;
  fileUrl?: string;
  externalId?: string;
};

@Injectable()
export class GoogleDriveService {
  getStatus(): GoogleDriveStatus {
    const credentials = this.getCredentials();
    const required = {
      GOOGLE_DRIVE_CLIENT_ID: credentials.clientId,
      GOOGLE_DRIVE_CLIENT_SECRET: credentials.clientSecret,
      GOOGLE_DRIVE_REFRESH_TOKEN: credentials.refreshToken,
      GOOGLE_DRIVE_ROOT_FOLDER_ID: credentials.rootFolderId,
    };

    const missing = Object.entries(required)
      .filter(([, value]) => !value || !value.trim())
      .map(([key]) => key);

    return {
      enabled: true,
      configured: missing.length === 0,
      rootFolderId: credentials.rootFolderId || null,
      missing,
    };
  }

  async uploadPdfArtifact(input: UploadPdfInput): Promise<UploadPdfResult> {
    const status = this.getStatus();
    if (!status.configured) {
      throw new ServiceUnavailableException(
        `Google Drive no esta configurado. Faltan: ${status.missing.join(', ')}`
      );
    }

    const credentials = this.getCredentials();
    const auth = new google.auth.OAuth2(credentials.clientId, credentials.clientSecret);
    auth.setCredentials({
      refresh_token: credentials.refreshToken,
    });

    const drive = google.drive({
      version: 'v3',
      auth,
    });

    const response = await drive.files.create({
      requestBody: {
        name: input.fileName,
        parents: credentials.rootFolderId ? [credentials.rootFolderId] : undefined,
      },
      media: {
        mimeType: 'application/pdf',
        body: input.pdfBytes,
      },
      fields: 'id,name,webViewLink,webContentLink',
    });

    return {
      provider: 'google-drive',
      stored: true,
      locationLabel: 'Google Drive',
      fileUrl: response.data.webViewLink ?? response.data.webContentLink ?? undefined,
      externalId: response.data.id ?? undefined,
    };
  }

  private getCredentials() {
    const read = (...keys: string[]) => {
      for (const key of keys) {
        const value = process.env[key]?.trim();
        if (value) {
          return value;
        }
      }
      return '';
    };

    return {
      clientId: read('GOOGLE_DRIVE_CLIENT_ID', 'GOOGLE_CALENDAR_CLIENT_ID'),
      clientSecret: read('GOOGLE_DRIVE_CLIENT_SECRET', 'GOOGLE_CALENDAR_CLIENT_SECRET'),
      refreshToken: read('GOOGLE_DRIVE_REFRESH_TOKEN', 'GOOGLE_CALENDAR_REFRESH_TOKEN'),
      rootFolderId: read('GOOGLE_DRIVE_ROOT_FOLDER_ID'),
    };
  }
}
