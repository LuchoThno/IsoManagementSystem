export type PdfGeneratedArtifact = {
  fileName: string;
  title: string;
  subject: string;
  keywords: string[];
  bytes: Uint8Array;
  checksum: string;
  generatedAtIso: string;
  sourceType: 'audit' | 'evidence';
  sourceId: string;
  generatedByName: string;
  generatedByEmail: string;
};

export type PdfStorageResult = {
  provider: 'document-repository' | 'google-drive' | 'local-download';
  stored: boolean;
  locationLabel: string;
  fileUrl?: string;
  externalId?: string;
};

export type PdfDeliveryResult = {
  provider: 'communications-module' | 'gmail' | 'disabled';
  delivered: boolean;
  reference?: string | null;
  detail: string;
};

export interface PdfStorageProvider {
  readonly id: string;
  store(artifact: PdfGeneratedArtifact): Promise<PdfStorageResult>;
}

export interface PdfDeliveryProvider {
  readonly id: string;
  deliver(
    artifact: PdfGeneratedArtifact,
    context: {
      storage?: PdfStorageResult | null;
      recipientEmails?: string[];
    }
  ): Promise<PdfDeliveryResult>;
}

export class LocalDownloadStorageProvider implements PdfStorageProvider {
  readonly id = 'local-download';

  async store(): Promise<PdfStorageResult> {
    return {
      provider: 'local-download',
      stored: false,
      locationLabel: 'Descarga local en navegador',
    };
  }
}

export class DocumentRepositoryStorageProvider implements PdfStorageProvider {
  readonly id = 'document-repository';

  async store(artifact: PdfGeneratedArtifact): Promise<PdfStorageResult> {
    return {
      provider: 'document-repository',
      stored: false,
      locationLabel: `Pendiente de integrar con repositorio documental para ${artifact.fileName}`,
    };
  }
}

export class GoogleDriveStorageProvider implements PdfStorageProvider {
  readonly id = 'google-drive';

  async store(artifact: PdfGeneratedArtifact): Promise<PdfStorageResult> {
    const { storePdfArtifactApi } = await import('./pdfArtifactsApi');
    return storePdfArtifactApi(artifact);
  }
}

export class DisabledDeliveryProvider implements PdfDeliveryProvider {
  readonly id = 'disabled';

  async deliver(): Promise<PdfDeliveryResult> {
    return {
      provider: 'disabled',
      delivered: false,
      detail: 'Entrega por correo deshabilitada en esta etapa del pipeline.',
    };
  }
}

export class CommunicationsModuleDeliveryProvider implements PdfDeliveryProvider {
  readonly id = 'communications-module';

  async deliver(
    artifact: PdfGeneratedArtifact,
    context: {
      storage?: PdfStorageResult | null;
      recipientEmails?: string[];
    }
  ): Promise<PdfDeliveryResult> {
    const { deliverPdfArtifactApi } = await import('./pdfArtifactsApi');
    return deliverPdfArtifactApi(artifact, {
      storage: context.storage,
      recipientEmails: context.recipientEmails ?? [artifact.generatedByEmail],
    });
  }
}

export class GmailDeliveryProvider implements PdfDeliveryProvider {
  readonly id = 'gmail';

  async deliver(artifact: PdfGeneratedArtifact): Promise<PdfDeliveryResult> {
    return {
      provider: 'gmail',
      delivered: false,
      detail: `Pendiente de integrar el envio directo por Gmail para ${artifact.fileName}.`,
    };
  }
}
