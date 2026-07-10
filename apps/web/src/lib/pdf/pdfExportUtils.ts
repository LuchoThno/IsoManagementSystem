import { PDFDocument } from 'pdf-lib';

type PdfMetadata = {
  title: string;
  subject: string;
  keywords: string[];
};

const saveBlob = (blob: Blob, fileName: string) => {
  const objectUrl = window.URL.createObjectURL(blob);
  const anchor = window.document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = fileName;
  anchor.rel = 'noopener';
  window.document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => {
    window.URL.revokeObjectURL(objectUrl);
  }, 1_000);
};

export const postProcessPdf = async (
  input: Uint8Array,
  metadata: PdfMetadata
) => {
  const pdfDocument = await PDFDocument.load(input);
  pdfDocument.setTitle(metadata.title);
  pdfDocument.setSubject(metadata.subject);
  pdfDocument.setKeywords(metadata.keywords);
  pdfDocument.setProducer('ISO Manager');
  pdfDocument.setCreator('ISO Manager');
  pdfDocument.setCreationDate(new Date());
  pdfDocument.setModificationDate(new Date());

  return pdfDocument.save();
};

export const downloadPdfBytes = (bytes: Uint8Array, fileName: string) => {
  saveBlob(new Blob([bytes], { type: 'application/pdf' }), fileName);
};
