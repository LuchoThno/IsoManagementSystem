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

type UploadFileInput = {
  fileName: string;
  mimeType: string;
  fileBytes: Buffer;
  folderSegments?: string[];
};

type UploadPdfResult = {
  provider: 'google-drive';
  stored: boolean;
  locationLabel: string;
  fileUrl?: string;
  externalId?: string;
};

type UploadFileResult = UploadPdfResult & {
  folderPath: string[];
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
    return this.uploadFileArtifact({
      fileName: input.fileName,
      mimeType: 'application/pdf',
      fileBytes: input.pdfBytes,
    });
  }

  async uploadFileArtifact(input: UploadFileInput): Promise<UploadFileResult> {
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

    const folderPath = (input.folderSegments ?? [])
      .map((segment) => this.normalizeFolderName(segment))
      .filter((segment) => segment.length > 0);
    const parentFolderId = await this.ensureFolderPath(
      drive,
      credentials.rootFolderId,
      folderPath
    );

    const response = await drive.files.create({
      requestBody: {
        name: input.fileName,
        parents: parentFolderId ? [parentFolderId] : undefined,
      },
      media: {
        mimeType: input.mimeType,
        body: input.fileBytes,
      },
      fields: 'id,name,webViewLink,webContentLink',
      supportsAllDrives: true,
    });

    return {
      provider: 'google-drive',
      stored: true,
      locationLabel:
        folderPath.length > 0 ? `Google Drive / ${folderPath.join(' / ')}` : 'Google Drive',
      fileUrl: response.data.webViewLink ?? response.data.webContentLink ?? undefined,
      externalId: response.data.id ?? undefined,
      folderPath,
    };
  }

  private async ensureFolderPath(
    drive: ReturnType<typeof google.drive>,
    rootFolderId: string,
    folderSegments: string[]
  ) {
    let parentId = rootFolderId;

    for (const segment of folderSegments) {
      parentId = await this.ensureFolder(drive, parentId, segment);
    }

    return parentId;
  }

  private async ensureFolder(
    drive: ReturnType<typeof google.drive>,
    parentId: string,
    folderName: string
  ) {
    const escapedFolderName = folderName.replace(/'/g, "\\'");
    const escapedParentId = parentId.replace(/'/g, "\\'");
    const response = await drive.files.list({
      q: [
        `mimeType = 'application/vnd.google-apps.folder'`,
        `name = '${escapedFolderName}'`,
        `'${escapedParentId}' in parents`,
        'trashed = false',
      ].join(' and '),
      fields: 'files(id,name)',
      pageSize: 1,
      includeItemsFromAllDrives: true,
      supportsAllDrives: true,
    });

    const existingFolderId = response.data.files?.[0]?.id;
    if (existingFolderId) {
      return existingFolderId;
    }

    const createdFolder = await drive.files.create({
      requestBody: {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentId],
      },
      fields: 'id',
      supportsAllDrives: true,
    });

    if (!createdFolder.data.id) {
      throw new ServiceUnavailableException('No fue posible crear la carpeta en Google Drive.');
    }

    return createdFolder.data.id;
  }

  private normalizeFolderName(value: string) {
    return value.replace(/[\\/:*?"<>|]/g, ' ').replace(/\s+/g, ' ').trim();
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
