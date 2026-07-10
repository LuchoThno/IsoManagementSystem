import { requestIsoApi } from '../isoApiClient';
import type { PdfGeneratedArtifact, PdfDeliveryResult, PdfStorageResult } from './pdfDeliveryProviders';

const toBase64 = (bytes: Uint8Array) => {
  let binary = '';
  bytes.forEach((value) => {
    binary += String.fromCharCode(value);
  });
  return window.btoa(binary);
};

export const storePdfArtifactApi = async (
  artifact: PdfGeneratedArtifact
): Promise<PdfStorageResult> =>
  requestIsoApi('/communications/pdf-artifacts/store', {
    method: 'POST',
    body: JSON.stringify({
      fileName: artifact.fileName,
      title: artifact.title,
      subject: artifact.subject,
      sourceType: artifact.sourceType,
      sourceId: artifact.sourceId,
      checksum: artifact.checksum,
      generatedAtIso: artifact.generatedAtIso,
      generatedByName: artifact.generatedByName,
      generatedByEmail: artifact.generatedByEmail,
      pdfBase64: toBase64(artifact.bytes),
      keywords: artifact.keywords,
    }),
  });

export const deliverPdfArtifactApi = async (
  artifact: PdfGeneratedArtifact,
  context: {
    storage?: PdfStorageResult | null;
    recipientEmails: string[];
  }
): Promise<PdfDeliveryResult> =>
  requestIsoApi('/communications/pdf-artifacts/deliver', {
    method: 'POST',
    body: JSON.stringify({
      fileName: artifact.fileName,
      title: artifact.title,
      subject: artifact.subject,
      sourceType: artifact.sourceType,
      sourceId: artifact.sourceId,
      checksum: artifact.checksum,
      generatedAtIso: artifact.generatedAtIso,
      generatedByName: artifact.generatedByName,
      generatedByEmail: artifact.generatedByEmail,
      recipientEmails: context.recipientEmails,
      pdfBase64: toBase64(artifact.bytes),
      fileUrl: context.storage?.fileUrl,
      storageLabel: context.storage?.locationLabel,
    }),
  });
