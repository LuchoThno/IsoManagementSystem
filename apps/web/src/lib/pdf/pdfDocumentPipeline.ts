import { PDFDocument } from 'pdf-lib';
import type React from 'react';
import { pdf } from '@react-pdf/renderer';
import {
  CommunicationsModuleDeliveryProvider,
  DisabledDeliveryProvider,
  GoogleDriveStorageProvider,
  type PdfDeliveryProvider,
  type PdfGeneratedArtifact,
  type PdfStorageProvider,
} from './pdfDeliveryProviders';
import { downloadPdfBytes, postProcessPdf } from './pdfExportUtils';

type PdfBuildInput = {
  document: React.ReactElement;
  fileName: string;
  title: string;
  subject: string;
  keywords: string[];
  sourceType: 'audit' | 'evidence';
  sourceId: string;
  generatedByName: string;
  generatedByEmail: string;
};

const defaultStorageProviders: PdfStorageProvider[] = [new GoogleDriveStorageProvider()];
const defaultDeliveryProviders: PdfDeliveryProvider[] = [
  new CommunicationsModuleDeliveryProvider(),
  new DisabledDeliveryProvider(),
];

const generateChecksum = async (bytes: Uint8Array) => {
  if (!window.crypto?.subtle) {
    return `LEG-${bytes.length.toString(16).toUpperCase()}`;
  }

  const digest = await window.crypto.subtle.digest('SHA-256', bytes);
  return `SHA256-${Array.from(new Uint8Array(digest))
    .map((item) => item.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 24)
    .toUpperCase()}`;
};

const postProcessWithPdfLib = async (artifact: PdfGeneratedArtifact) => {
  const bytes = await postProcessPdf(artifact.bytes, {
    title: artifact.title,
    subject: artifact.subject,
    keywords: artifact.keywords,
  });

  const pdfDocument = await PDFDocument.load(bytes);
  const pages = pdfDocument.getPages();
  const totalPages = pages.length;

  pages.forEach((page, index) => {
    page.drawText(`Pagina ${index + 1} de ${totalPages}`, {
      x: page.getWidth() - 120,
      y: 18,
      size: 9,
    });
  });

  return pdfDocument.save();
};

export const buildPdfArtifact = async (input: PdfBuildInput): Promise<PdfGeneratedArtifact> => {
  const blob = await pdf(input.document).toBlob();
  const bytes = new Uint8Array(await blob.arrayBuffer());

  return {
    fileName: input.fileName,
    title: input.title,
    subject: input.subject,
    keywords: input.keywords,
    bytes,
    checksum: await generateChecksum(bytes),
    generatedAtIso: new Date().toISOString(),
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    generatedByName: input.generatedByName,
    generatedByEmail: input.generatedByEmail,
  };
};

export const executePdfDocumentPipeline = async (
  input: PdfBuildInput,
  options?: {
    storageProviders?: PdfStorageProvider[];
    deliveryProviders?: PdfDeliveryProvider[];
  }
) => {
  const artifact = await buildPdfArtifact(input);
  const finalizedBytes = await postProcessWithPdfLib(artifact);
  const finalizedArtifact: PdfGeneratedArtifact = {
    ...artifact,
    bytes: finalizedBytes,
    checksum: await generateChecksum(finalizedBytes),
  };

  downloadPdfBytes(finalizedBytes, finalizedArtifact.fileName);

  const storageProviders = options?.storageProviders ?? defaultStorageProviders;
  const deliveryProviders = options?.deliveryProviders ?? defaultDeliveryProviders;

  const storageResults = [];
  for (const provider of storageProviders) {
    storageResults.push(await provider.store(finalizedArtifact));
  }

  const primaryStorage = storageResults.find((result) => result.stored) ?? storageResults[0] ?? null;

  const deliveryResults = [];
  for (const provider of deliveryProviders) {
    deliveryResults.push(
      await provider.deliver(finalizedArtifact, {
        storage: primaryStorage,
      })
    );
  }

  return {
    artifact: finalizedArtifact,
    storageResults,
    deliveryResults,
  };
};
